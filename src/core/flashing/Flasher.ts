import type { ISerialConnection, Protobuf } from "@meshtastic/meshtasticjs";
import type { ConfigPreset } from "../stores/appStore";
import type { Device } from "../stores/deviceStore";
import { EspLoader } from "@toit/esptool.js";

type State = "idle" | "connecting" | "erasing" | "flashing" | "config" | "done";

export class Flasher {

    public progress: FlashState[];
    public static sections: {data: Uint8Array, offset: number}[] = [ ];
    public static initDone: boolean = false;
    

    public constructor(public devices: Device[], configs: ConfigPreset[], public callback: (flashState: FlashState) => void) {
        const configMap: Protobuf.LocalConfig[] = [];
        for(const c in configs) {
            const config = configs[c];
            for (let i = 0; i < config.count; i++) {
                configMap.push(config.config);
            }            
        }

        const d = devices.slice(0, Math.min(devices.length, configMap.length));
        this.progress = d.map((device, i) => new FlashState(device, configMap[i]));
    }

    public static async Init() {
        this.initDone = true;
        await Flasher.DownloadFirmware("firmware-tlora-v2-1-1.6-2.0.6.97fd5cf.bin", 0, 0);
        await Flasher.DownloadFirmware("bleota.bin", 2490368, 1);
        await Flasher.DownloadFirmware("littlefs-2.0.6.97fd5cf.bin", 3145728, 2);
    }

    private static async DownloadFirmware(path: string, offset: number, slot: number) {        
        const request = new XMLHttpRequest();
        request.open("GET", `http://localhost:8080/data/${path}`, true);
        request.responseType = "arraybuffer";    
        let data: Uint8Array;
        request.onloadend = () => {               
            data = new Uint8Array(request.response);
            Flasher.sections[slot] = {data, offset}; 
            console.log(`Downloaded ${path}`);
            // if(Flasher.sections.length == 3)
            //     Promise.resolve();
            // if(downloaded == 3) {
            //     console.log("Unlocked button");
            //     document.getElementById("add-btn")?.addEventListener('click', (ev) => addSlot());
            //     document.getElementById("select-btn")?.addEventListener('click', (ev) => addDevices());
            //     document.getElementById("go-btn")?.addEventListener('click', (ev) => {
            //         for(let i = 0; i < setCounter; i++) {
            //             if(ports[i].done)
            //                 continue;
            //             start(i);
            //         }                
            //     });
            // }            
        };
        request.send();        
    }

    public async FlashAll() {
        debugger;
        for(const p in this.progress) {
            const progress = this.progress[p];
            this.FlashDevice(progress);
            // this.setConfig(progress);
        }
    }

    public async FlashDevice(state: FlashState) {      
        const sections = Flasher.sections;  
        const port = await (state.device.connection! as ISerialConnection).freePort();
        await port!.open({baudRate: 115200});
        const loader = new EspLoader(port!);
        this.setState(state, "connecting");
        await loader.connect();
        await loader.loadStub();
        this.setState(state, "erasing");
        const t = this;
        try {                
            await loader.eraseFlash();        
        
            for (let i = 0; i < 3; i++) {              
              await loader.flashData(sections[i].data, sections[i].offset, function (idx, cnt) {
                t.setState(state, "flashing", (1/3)  * idx/cnt);
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
        t.setState(state, "done", 0);
    }

    private async setConfig(state: FlashState) {

    }

    private setState(flashState: FlashState, state: State, progress = 0) {
        flashState.state = state;
        flashState.progress = progress;
        console.log(`${state}: ${progress}`);
        this.callback(flashState);
    }

}

export class FlashState {
    
    public state: State = "connecting";
    public progress: number = 0;

    public constructor(public device: Device, public config: Protobuf.LocalConfig) {
        
    }

}