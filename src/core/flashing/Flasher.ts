import JSZip from 'jszip';

import {
  ISerialConnection,
  Protobuf,
} from '@meshtastic/meshtasticjs';
import { EspLoader } from '@toit/esptool.js';

import type { ConfigPreset } from '../stores/appStore';
import type { Device } from '../stores/deviceStore';
import { FirmwareVersion, deviceModels } from '@app/components/PageComponents/Flasher/FlashSettings';
import { storeInDb, loadFromDb } from './FirmwareDb';
import * as esptooljs from "esptool-js";

type DeviceFlashingState = "doNotFlash" | "doFlash" | "idle" | "preparing" | "erasing" | "flashing" | "config" | "done" | "aborted" | "failed";
export type OverallFlashingState = "idle" | "downloading" | "busy" | "waiting";

type OverallFlashingCallback = (flashState: OverallFlashingState, progress?: number) => void;

let dataSections: {[index: string]: Uint8Array};
let zipFile: JSZip;
let configQueue: Protobuf.LocalConfig[] = [];
let firmwareToUse: FirmwareVersion;
let operations: FlashOperation[] = [];
let callback: OverallFlashingCallback;
let selectedDeviceModel: string;
let fullFlash: boolean;

export async function setup(configs: ConfigPreset[], deviceModelName: string, firmware: FirmwareVersion,
    forceFullFlash: boolean, overallCallback: OverallFlashingCallback) {
    dataSections = {};
    selectedDeviceModel = deviceModelName;
    callback = overallCallback;
    console.log(`Firmware to use: ${firmware?.name} - ${firmware?.id}`);
    firmwareToUse = firmware;
    fullFlash = forceFullFlash;
    await loadFirmware();
    for(const c in configs) {
        const config = configs[c];
        for (let i = 0; i < config.count; i++) {
            configQueue.push(config.config);
        }            
    }    
}

export async function nextBatch(devices: Device[], flashStates: FlashState[], deviceCallback: (flashState: FlashOperation) => void) {
    callback("busy");    
    devices = devices.filter((d, i) => flashStates[i].state == "doFlash");
    flashStates = flashStates.filter(f => f.state == "doFlash");
    if(devices.length > configQueue.length) {
        console.warn("Too many devices!");
        devices = devices.slice(0, configQueue.length);
    }
    operations = devices.map((dev, index) => new FlashOperation(dev, configQueue[index], deviceCallback));
    operations.forEach((o, i) => o.state = flashStates[i]);
    configQueue = configQueue.slice(operations.length)
    console.log(`New config queue count: ${configQueue.length}`);
    
    Promise.allSettled(operations.map(op => op.flashAndConfigDevice())).then(p => handleFlashingDone());
}

export function cancel() {
    operations.forEach(o => o.cancel());
    callback("idle");
}

function handleFlashingDone() {
    if(configQueue.length == 0)
        callback("idle");
    else
        callback("waiting");
}

export async function uploadCustomFirmware() {
    //@ts-ignore
    const promise: Promise<FileSystemFileHandle[]> = window.showOpenFilePicker({
      types: [ { description: "ZIP file", accept: { "application/zip": [".zip"] } }]
    });
    const fileHandle: FileSystemFileHandle | undefined = await promise.then(f => f[0], () => undefined);
    if(fileHandle == undefined)
      return undefined;
    try {
      const file = await fileHandle.getFile();      
      const content = await file.arrayBuffer();
      const firmwareDesc: FirmwareVersion = {
        id: "custom_" + file.name,
        name: file.name,
        inLocalDb: true,
        isPreRelease: false,
        tag: "custom_" + file.name
      }
      storeInDb(firmwareDesc, content);
      return firmwareDesc;
    } catch {
      console.error("Insufficient permission to access file.");
    } 
    return undefined;
  }

async function getZipFile() {    
    if(firmwareToUse.inLocalDb) {
        const storedZip = await loadFromDb(firmwareToUse);
        if(storedZip !== undefined)
            return storedZip;
    }

    const zip = await fetch(`/firmware/${firmwareToUse.id}`);
    const zipClone = zip.clone();
    const contentLength = zip.headers.get("content-length");
    const totalLength = contentLength ? parseInt(contentLength) : undefined;    
    const reader = zip.body!.getReader();
    let bytesLoaded = 0;
    
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;

        bytesLoaded += value!.byteLength;
        callback("downloading", totalLength ? bytesLoaded / totalLength : undefined);
    }
    const content = await zipClone.arrayBuffer();
    storeInDb(firmwareToUse, content);
    return content;
}

async function loadFirmware() {    
    console.log("Loading firmware");
    // TODO: Error handling

    const zip = await getZipFile();
    zipFile = await JSZip.loadAsync(zip);    
}

async function getSection(name: string): Promise<Uint8Array | undefined> {    
    if(!(name in dataSections)) {
        const dataSection = await zipFile.file(name)?.async("uint8array");
        if(dataSection === undefined) {
            console.warn(`Firmware file ${name} not found.`);
            return undefined;
        }            
        dataSections[name] = dataSection;
    }            
    return dataSections[name];
}

async function getFirmwareSections(deviceModel: string, update: boolean) {
    if(update) {
        const updateFilename = `firmware-${deviceModel}-${firmwareToUse.tag}-update.bin`;
        const mainUpdate = await getSection(updateFilename);
        if(mainUpdate !== undefined) {
            return [ { offset: 0x10000, data: mainUpdate } ];
        }
    }
    const filename = `firmware-${deviceModel}-${firmwareToUse.tag}.bin`;
    const main = await getSection(filename);
    const bleoata = await getSection("bleota.bin");
    const littlefs = await getSection(`littlefs-${firmwareToUse.tag}.bin`);
    if(main === undefined || bleoata === undefined || littlefs === undefined)
        throw "Missing firmware files.";

    return [            // TODO: Is this correct for all device models?
        { offset: 0, data: main },
        { offset: 0x260000, data: bleoata },
        { offset: 0x300000, data: littlefs }
    ];
}

function autoDetectDeviceModel(port: SerialPort) {
    const info = port.getInfo();
    return deviceModels.find(d => info.usbVendorId == d.vendorId && info.usbProductId == d.productId)?.name;
}


export class FlashOperation {
        
    public state: FlashState = { progress: 0, state: "idle" };
    public errorReason?: string;
    private loader?: esptooljs.ESPLoader; 

    public constructor(public device: Device, public config: Protobuf.LocalConfig, public callback: (operation: FlashOperation) => void) {
        
    }

    public setState(state: DeviceFlashingState, progress = 0, errorReason : string | undefined = undefined) {
        console.log(`${this.device.nodes.get(this.device.hardware.myNodeNum)?.user
            ?.longName ?? "<Not flashed yet>"} flash state: ${state}`);
        this.state = {state, progress};
        this.errorReason = errorReason;
        this.callback(this);
    }

    public async flashAndConfigDevice() {
        try {
            await this.flash();
            // await this.setConfig();
            this.setState("done");
        }   
        catch(e) {
            this.setState("failed", 0, e as string);            
            throw e;
        }     
        
    }

    private async flash() {
        const installedVersion = this.device.hardware.firmwareVersion;
        console.log(`Installed firmware verson: ${installedVersion}`);
        const update = !fullFlash && this.device.nodes.get(this.device.hardware.myNodeNum) !== undefined ;    
        // if(update && installedVersion == firmwareToUse.tag)
        //     return;

        const port = await (this.device.connection! as ISerialConnection).disconnect();
        if(port === undefined)
            throw "Port unavailable";
        const deviceModel = selectedDeviceModel == "auto" ? autoDetectDeviceModel(port) : selectedDeviceModel;
        if(deviceModel === undefined)
            throw "Could not detect device model";
        const info = port.getInfo();
        console.log(`Device info: vendor ${info.usbVendorId}, product ${info.usbProductId}`);
        const sections = await getFirmwareSections(deviceModel, update);
        // await port!.open({baudRate: 115200});

        debugger;

        // -----------
        
        try {         
            const transport = new esptooljs.Transport(port);
            this.loader = new esptooljs.ESPLoader(transport, 115200);                           
            const loader = this.loader;
            this.setState("preparing");
            await loader.main_fn();            // TODO: This returns some interesting stuff, check it out            
            if(sections.length > 1) {
                this.setState("erasing");                
                await loader.erase_flash();
            }                   
            const totalLength = sections.reduce<number>((p, c) => p + c.data.byteLength, 0);
            let bytesFlashed = 0;
            let lastIndex = 0;

            const files = await Promise.all(sections.map(async s => {
                //  TODO:  Move this to loading, also check if  this can be handled by loader.ui8ToBstr()
                const fileReader = new FileReader();
                const blob = new Blob([s.data]);
                const content = await new Promise<string>((resolve, reject) => {
                    fileReader.onloadend = e => resolve(fileReader.result as string);
                    fileReader.onerror = e => reject(fileReader.result as string);
                    fileReader.readAsBinaryString(blob); 
                });
                return { data: content, address: s.offset };
            }));

            await loader.write_flash(files, "keep", undefined,  undefined, false, true, (index, written, total) => {
                if(index != lastIndex) {
                    bytesFlashed += sections[lastIndex].data.byteLength;
                    lastIndex = index;
                }
                // I don't know what kind of weird size esploader computes but it doesn't match ours
                const bytesThisSegment = (written / total) * sections[index].data.byteLength;
                console.log(`FLASHING PROGRESS ${bytesFlashed + written} / ${totalLength} ... ${bytesFlashed} | ${written} | ${total} | ${index}`);
                this.setState("flashing", (bytesFlashed + bytesThisSegment) /  totalLength);
            });                            
        }
        catch (e) {                                    
            throw e;            
        }
        finally {        
            
        }

        debugger;
        this.setState("config");
        await port!.setSignals({requestToSend: true});
        await new Promise(r => setTimeout(r, 100));   
        await port!.setSignals({requestToSend: false});    
        await port!.close();
        const connection = (this.device.connection! as ISerialConnection);
        await connection.connect({ 
            port,
            baudRate: undefined,
            concurrentLogOutput: true
        });
    }

    private async setConfig() {
        try {
            this.setState("config");
            const connection = (this.device.connection! as ISerialConnection);
                    
            const newConfig = new Protobuf.Config({
                payloadVariant: {
                    case: "device",
                    value: this.config.device!
                }
            });
            const promise = connection.setConfig(newConfig).then(() => 
            connection.commitEditSettings().then(() => console.log("FLASHER: Config saved"))
            ).catch(e => console.error(e));
            
            // We won't get an answer if serial output has been disabled in the new config
            if(this.config.device!.serialEnabled)
                await promise;
            
        }
        catch(e) {
            this.setState("failed");            
        }
    }

    public async cancel() {        
        await this.loader?.disconnect();
        this.setState("aborted");
    }

}

export interface FlashState {
    state: DeviceFlashingState,
    progress: number,
};