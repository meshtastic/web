import { useDeviceStore } from "@app/core/stores/deviceStore";
import { DeviceWrapper } from "@app/DeviceWrapper";
import { ConfigPage } from "@app/pages/Config";
import { Mono } from "./generic/Mono";
import { PageNav } from "./PageNav";
import { SidebarSetup } from "./SidebarSetup";



export const SetupPage = (): JSX.Element => {
    const { getDevices } = useDeviceStore();
    const testDevice = getDevices()[0];

    return (
        <DeviceWrapper device={testDevice}>
            
                <SidebarSetup/>
                    
                <ConfigPage/>            
        </DeviceWrapper>
    );
}