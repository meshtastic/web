import JSZip from 'jszip';

import {
  deviceModels,
  FirmwareVersion,
} from '@app/components/Dashboard';
import {
  ISerialConnection,
  Protobuf,
} from '@meshtastic/meshtasticjs';
import { EspLoader } from '@toit/esptool.js';

import type { ConfigPreset } from '../stores/appStore';
import type { Device } from '../stores/deviceStore';

type DeviceFlashingState = "doNotFlash" | "doFlash" | "idle" | "connecting" | "erasing" | "flashing" | "config" | "done" | "aborted" | "failed";
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
    
    Promise.allSettled(operations.map(op => op.flash())).then(p => handleFlashingDone());
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

function openDb() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const db = indexedDB.open("firmwares");
        db.onsuccess = () => {
            resolve(db.result);
            
        };    
        db.onupgradeneeded = (ev) => {
            const objStore = db.result.createObjectStore("files");            
            objStore.transaction.oncomplete = () => resolve(db.result);
        };
    });
}

async function storeInDb(firmware: FirmwareVersion, file: ArrayBuffer) {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
        const fileStore = db.transaction("files", "readwrite").objectStore("files");
        const addOp = fileStore.add(file, firmware.tag);
        fileStore.transaction.oncomplete = () => {
            console.log("Successfully stored firmware in DB.");
            resolve();
        }
        fileStore.transaction.onerror = reject;
    });    
}

async function loadFromDb(firmware: FirmwareVersion) {    
    const db = await openDb();
    return new Promise<ArrayBuffer>((resolve, reject) => {                
        const objStore = db.transaction("files", "readonly").objectStore("files");
        const transaction = objStore.get(firmware.tag);
        transaction.onsuccess = () => {   
            resolve(transaction.result as ArrayBuffer);
        };
        transaction.onerror = reject;                    
    });
}

async function deleteFromDb(firmware: FirmwareVersion) {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {  
        if(!db.objectStoreNames.contains("files")) {
            resolve();
            return;
        }
        const objStore = db.transaction("files", "readonly").objectStore("files");
        const transaction = objStore.delete(firmware.tag);            
        transaction.onsuccess = () => resolve;
        transaction.onerror = reject;    
    });
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

async function getFirmwareSections(deviceModel: string, alreadyFlashed: boolean) {
    if(alreadyFlashed && !fullFlash) {
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
    private loader?: EspLoader; 

    public constructor(public device: Device, public config: Protobuf.LocalConfig, public callback: (operation: FlashOperation) => void) {
        
    }

    public setState(state: DeviceFlashingState, progress = 0) {
        console.log(`${this.device.nodes.get(this.device.hardware.myNodeNum)?.user
            ?.longName ?? "<Not flashed yet>"} flash state: ${state}`);
        this.state = {state, progress};
        this.callback(this);
    }

    public async flash() {
        let port: SerialPort | undefined;
        try {
            debugger;
            const updatePossible = this.device.nodes.get(this.device.hardware.myNodeNum) !== undefined;
            port = await (this.device.connection! as ISerialConnection).disconnect();
            if(port === undefined)
                throw "Port unavailable";
            const deviceModel = selectedDeviceModel == "auto" ? autoDetectDeviceModel(port) : selectedDeviceModel;
            if(deviceModel === undefined)
                throw "Could not detect device model";
            const info = port.getInfo();
            console.log(`Device info: vendor ${info.usbVendorId}, product ${info.usbProductId}`);
            const sections = await getFirmwareSections(deviceModel, updatePossible);
            await port!.open({baudRate: 115200});
            this.loader = new EspLoader(port!);
            const loader = this.loader;
            this.setState("connecting");
            await loader.connect();
            await loader.loadStub();
            if(sections.length > 1) {
                this.setState("erasing");                
                await loader.eraseFlash();            
            }       
            const thisOp = this;
            const totalLength = sections.reduce<number>((p, c) => p + c.data.byteLength, 0);
            let bytesFlashed = 0;
            for (let i = 0; i < sections.length; i++) {                              
                await loader.flashData(sections[i].data, sections[i].offset, function (idx, cnt) {
                    const segSize = sections[i].data.length / cnt;                    
                    thisOp.setState("flashing", (bytesFlashed + idx * segSize) / totalLength);
                    console.log(`Flashing progress: ${bytesFlashed} + ${(idx * segSize).toFixed(2)}/${sections[i].data.length} = ${(bytesFlashed + idx * segSize).toFixed(2)} / ${totalLength}`);
                });
                bytesFlashed += sections[i].data.byteLength;
            }    
        }
        catch (e) {            
            this.setState("failed");
            return;
        }
        finally {        
            await this.loader!.disconnect();
        }

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
                
        const newConfig = new Protobuf.Config({
            payloadVariant: {
                case: "device",
                value: this.config.device!
            }
        });
        const promise = connection.setConfig(newConfig).then(() => 
        connection.commitEditSettings().then(() => console.log("FLASHER: Config saved"))
        );
        
        // We won't get an answer if serial output has been disabled in the new config
        if(this.config.device!.serialEnabled)
            await promise;

        this.setState("done");
    }

    public async cancel() {
        debugger;
        await this.loader?.disconnect();
        this.setState("aborted");
    }

}

export interface FlashState {
    state: DeviceFlashingState,
    progress: number,
};