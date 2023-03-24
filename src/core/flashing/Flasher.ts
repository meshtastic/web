import JSZip from 'jszip';

import type { FirmwareVersion } from '@app/components/Dashboard';
import type {
  ISerialConnection,
  Protobuf,
} from '@meshtastic/meshtasticjs';
import { EspLoader } from '@toit/esptool.js';

import { ConfigPreset } from '../stores/appStore';
import type { Device } from '../stores/deviceStore';

type DeviceFlashingState = "doNotFlash" | "doFlash" | "idle" | "connecting" | "erasing" | "flashing" | "config" | "done" | "aborted" | "failed";
export type OverallFlashingState = "idle"  | "busy" | "waiting";

const sections: {data: Uint8Array, offset: number}[] = [ ];
let configQueue: Protobuf.LocalConfig[] = [];
let firmwareToUse: FirmwareVersion;
let operations: FlashOperation[] = [];
let callback: (flashState: OverallFlashingState) => void;

export async function setup(configs: ConfigPreset[], firmware: FirmwareVersion, overallCallback: (flashState: OverallFlashingState) => void) {        
    callback = overallCallback;
    console.log(`Firmware to use: ${firmware?.name} - ${firmware?.link}`);
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

    const zip = await fetch("firmware-2.1.5.23272da.zip");
    const content = await zip.arrayBuffer();
    storeInDb(firmwareToUse, content);
    return content;
}

function getFileName() {
    const device = "tlora-v2-1-1.6";
    return `firmware-${device}-${firmwareToUse.tag}.bin`;
}

async function loadFirmware() {        
    console.warn("Loading firmware");
    // TODO: Error handling
    debugger;
    // TODO: Figure out CORS stuff

    const zip = await getZipFile();
    const z = await JSZip.loadAsync(zip);    
    const filename = getFileName();
    const mainFile = await z.file(filename)?.async("uint8array");
    const bleoata = await z.file("bleota.bin")?.async("uint8array");
    const littlefs = await z.file(`littlefs-${firmwareToUse.tag}.bin`)?.async("uint8array");
    if(mainFile === undefined || bleoata === undefined || littlefs === undefined)
        throw "Missing file(s)";
    sections.push(...[
        { offset: 0, data: mainFile },
        { offset: 0x260000, data: bleoata },
        { offset: 0x300000, data: littlefs }
    ]);    
}

async function downloadFirmware(path: string, offset: number, slot: number) {     
    const req = await fetch(path);
    if(!req.ok)
        throw "failed";
    const hmm = await req.arrayBuffer();
    const data = new Uint8Array(hmm);
    sections[slot] = {data, offset};
    console.log(`Downloaded ${path}`);      
}

function getDeviceType(port: SerialPort) {
    const info = port.getInfo();
    switch(info.usbVendorId) {
        case 6790:
            switch(info.usbProductId) {
                case 21972:
                    return "tlora-v2-1-1.6";
            }
            break;
    }
    return undefined;
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
            const info = port?.getInfo();
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