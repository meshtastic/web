import type { ISerialConnection, Protobuf } from "@meshtastic/meshtasticjs";
import { ConfigPreset, useAppStore } from "../stores/appStore";
import type { Device } from "../stores/deviceStore";
import { EspLoader } from "@toit/esptool.js";

type DeviceFlashingState = "doNotFlash" | "doFlash" | "idle" | "connecting" | "erasing" | "flashing" | "config" | "done";
export type OverallFlashingState = "idle"  | "busy" | "waiting";

const sections: {data: Uint8Array, offset: number}[] = [ ];
let configQueue: Protobuf.LocalConfig[] = [];
let firmwareAvailable: boolean = false;
let callback: (flashState: OverallFlashingState) => void;

export async function setup(configs: ConfigPreset[], overallCallback: (flashState: OverallFlashingState) => void) {        
    callback = overallCallback;    
    if(!firmwareAvailable)
        await init();    
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
    const operations = devices.map((dev, index) => new FlashOperation(dev, configQueue[index], deviceCallback));
    operations.forEach((o, i) => o.state = flashStates[i]);
    configQueue = configQueue.slice(operations.length)
    console.log(`New config queue count: ${configQueue.length}`);
    
    Promise.allSettled(operations.map(op => flashDevice(op))).then(p => handleFlashingDone());
}

function handleFlashingDone() {
    if(configQueue.length == 0)
        callback("idle");
    else
        callback("waiting");
}

async function init() {        
    firmwareAvailable = true;
    await downloadFirmware("firmware-tlora-v2-1-1.6-2.0.6.97fd5cf.bin", 0, 0);
    await downloadFirmware("bleota.bin", 2490368, 1);
    await downloadFirmware("littlefs-2.0.6.97fd5cf.bin", 3145728, 2);
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


async function flashDevice(state: FlashOperation) {          
    const port = await (state.device.connection! as ISerialConnection).freePort();
    await port!.open({baudRate: 115200});
    const loader = new EspLoader(port!);
    state.setState("connecting");
    await loader.connect();
    await loader.loadStub();
    state.setState("erasing");
    await new Promise(resolve => setTimeout(resolve, 2000));
    // try {                
    //     await loader.eraseFlash();        
    
    //     for (let i = 0; i < 3; i++) {              
    //         await loader.flashData(sections[i].data, sections[i].offset, function (idx, cnt) {
    //         state.setState("flashing", (1/3)  * idx/cnt);
    //         });          
    //     }                
    //     } finally {        
    //     await loader.disconnect();             
    // }  
    // port!.setSignals({requestToSend: true});
    // await new Promise(r => setTimeout(r, 100));   
    // port!.setSignals({requestToSend: false});    
    // await port!.close();           
    // (state.device.connection! as ISerialConnection).connect({ 
    //     port,
    //     baudRate: 115200,
    //     concurrentLogOutput: true
    // });               
    state.setState("done", 0);    
}


export class FlashOperation {
        
    public state: FlashState = { progress: 0, state: "idle" };    

    public constructor(public device: Device, public config: Protobuf.LocalConfig, public callback: (operation: FlashOperation) => void) {
        
    }

    public setState(state: DeviceFlashingState, progress = 0) {
        console.log(`${this.device.nodes.get(this.device.hardware.myNodeNum)?.user
            ?.longName ?? "<Not flashed yet>"} flash state: ${state}`);
        this.state = {state, progress};
        this.callback(this);
    }

}

export interface FlashState {
    state: DeviceFlashingState,
    progress: number,
};