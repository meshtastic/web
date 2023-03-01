import type { ISerialConnection, Protobuf } from "@meshtastic/meshtasticjs";
import type { ConfigPreset } from "../stores/appStore";
import type { Device } from "../stores/deviceStore";
import { EspLoader } from "@toit/esptool.js";

type State = "doNotFlash" | "doFlash" | "idle" | "connecting" | "erasing" | "flashing" | "config" | "done";

export class Flasher {
    
    // TODO: Add choice for different firmwares
    public sections: {data: Uint8Array, offset: number}[] = [ ];
    public firmwareAvailable: boolean = false;

    public async flashAll(devices: Device[], configs: ConfigPreset[], callback: (flashState: FlashOperation) => void) {
        if(!this.firmwareAvailable)
            await this.init();

        const configMap: Protobuf.LocalConfig[] = [];
        for(const c in configs) {
            const config = configs[c];
            for (let i = 0; i < config.count; i++) {
                configMap.push(config.config);
            }            
        }
        if(devices.length < configMap.length)
            throw "Not enough devices"

        const operations = configMap.map((cfg, index) => new FlashOperation(devices[index], cfg, callback));
        operations.map(op => this.flashDevice(op));
    }

    public constructor() {
        // this.Init();
    }

    public async init() {        
        this.firmwareAvailable = true;
        await this.downloadFirmware("firmware-tlora-v2-1-1.6-2.0.6.97fd5cf.bin", 0, 0);
        await this.downloadFirmware("bleota.bin", 2490368, 1);
        await this.downloadFirmware("littlefs-2.0.6.97fd5cf.bin", 3145728, 2);
    }

    private async downloadFirmware(path: string, offset: number, slot: number) {     
        const req = await fetch(path);
        if(!req.ok)
            throw "failed";
        const hmm = await req.arrayBuffer();
        const data = new Uint8Array(hmm);
        this.sections[slot] = {data, offset};
        console.log(`Downloaded ${path}`);      
    }


    public async flashDevice(state: FlashOperation) {      
        const sections = this.sections;  
        const port = await (state.device.connection! as ISerialConnection).freePort();
        await port!.open({baudRate: 115200});
        const loader = new EspLoader(port!);
        state.setState("connecting");
        await loader.connect();
        await loader.loadStub();
        state.setState("erasing");
        const t = this;
        try {                
            await loader.eraseFlash();        
        
            for (let i = 0; i < 3; i++) {              
              await loader.flashData(sections[i].data, sections[i].offset, function (idx, cnt) {
                state.setState("flashing", (1/3)  * idx/cnt);
              });          
            }                
          } finally {        
            await loader.disconnect();             
        }  
        port!.setSignals({requestToSend: true});
        await new Promise(r => setTimeout(r, 100));   
        port!.setSignals({requestToSend: false});    
        await port!.close();           
        (state.device.connection! as ISerialConnection).connect({ 
            port,
            baudRate: 115200,
            concurrentLogOutput: true
        });               
        state.setState("done", 0);
    }

}

export class FlashOperation {
        
    public state: FlashState = { progress: 0, state: "idle" };    

    public constructor(public device: Device, public config: Protobuf.LocalConfig, public callback: (operation: FlashOperation) => void) {
        
    }

    public setState(state: State, progress = 0) {
        this.state = {state, progress};
        this.callback(this);
    }

}

export interface FlashState {
    state: State,
    progress: number,
};