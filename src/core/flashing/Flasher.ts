import JSZip from 'jszip';

import {
  deviceModels,
  FirmwareVersion,
} from '@app/components/Dashboard';
import type {
  ISerialConnection,
  Protobuf,
} from '@meshtastic/meshtasticjs';
import { EspLoader } from '@toit/esptool.js';

import { ConfigPreset } from '../stores/appStore';
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

export async function setup(configs: ConfigPreset[], deviceModelName: string, firmware: FirmwareVersion, overallCallback: OverallFlashingCallback) {
    dataSections = {};
    selectedDeviceModel = deviceModelName;
    callback = overallCallback;
    console.log(`Firmware to use: ${firmware?.name} - ${firmware?.id}`);
    firmwareToUse = firmware;
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
    debugger;
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

function storeInDb(firmware: FirmwareVersion, file: ArrayBuffer) {
    const db = indexedDB.open("firmwares");
    db.onsuccess = () => {
        debugger;
        store(db.result, firmware, file);
    };    
    db.onupgradeneeded = (ev) => {
        const objStore = db.result.createObjectStore("files");
        debugger;
        objStore.transaction.oncomplete = () => store(db.result, firmware, file);
    };    
}

async function loadFromDb(firmware: FirmwareVersion) {    
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const db = indexedDB.open("firmwares");
        db.onsuccess = () => {
            const objStore = db.result.transaction("files", "readonly").objectStore("files");
            const transaction = objStore.get(firmware.tag);
            transaction.onsuccess = () => {   
                debugger;             
                resolve(transaction.result as ArrayBuffer);
            };
            transaction.onerror = reject;            
        }
    });
}

function store(db: IDBDatabase, firmware: FirmwareVersion, file: ArrayBuffer) {
    debugger;
    const fileStore = db.transaction("files", "readwrite").objectStore("files");
    fileStore.transaction.oncomplete = () => {        
        console.log("Successfully stored firmware in DB.");
    }
    fileStore.add(file, firmware.tag);
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

async function getSection(name: string): Promise<Uint8Array> {    
    if(!(name in dataSections)) {
        const dataSection = await zipFile.file(name)?.async("uint8array");
        if(dataSection === undefined)
            throw `File ${name} missing from firmware directory`;
        dataSections[name] = dataSection;
    }            
    return dataSections[name];
}

async function getFirmwareSections(deviceModel: string) {
    debugger;
    const filename = `firmware-${deviceModel}-${firmwareToUse.tag}.bin`;
    const mainFile = await getSection(filename);
    const bleoata = await getSection("bleota.bin");
    
    const littlefs = await getSection(`littlefs-${firmwareToUse.tag}.bin`);

    return [            // TODO: Is this correct for all device models?
        { offset: 0, data: mainFile },
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
        let port;
        try {
            port = await (this.device.connection! as ISerialConnection).freePort();
            if(port === undefined)
                throw "Port unavailable";
            const deviceModel = selectedDeviceModel == "auto" ? autoDetectDeviceModel(port) : selectedDeviceModel;
            if(deviceModel === undefined)
                throw "Could not detect device model";
            const info = port.getInfo();
            console.log(`Device info: vendor ${info.usbVendorId}, product ${info.usbProductId}`);
            const sections = await getFirmwareSections(deviceModel);
            await port!.open({baudRate: 115200});
            this.loader = new EspLoader(port!);
            const loader = this.loader;
            this.setState("connecting");
            await loader.connect();
            await loader.loadStub();
            this.setState("erasing");
            await new Promise(resolve => setTimeout(resolve, 2000));
            await loader.eraseFlash();            
            const lul = this;
            for (let i = 0; i < 3; i++) {              
                await loader.flashData(sections[i].data, sections[i].offset, function (idx, cnt) {
                    lul.setState("flashing", (1/3) * (i + idx/cnt));
                });
            }    
        }
        catch (e) {
            debugger;
            this.setState("failed");
            return;
        }
        finally {        
            await this.loader!.disconnect();       
            debugger;      
        }
        port!.setSignals({requestToSend: true});
        await new Promise(r => setTimeout(r, 100));   
        port!.setSignals({requestToSend: false});    
        await port!.close();           
        (this.device.connection! as ISerialConnection).connect({ 
            port,
            baudRate: 115200,
            concurrentLogOutput: true
        });               
        this.setState("done", 0);    
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