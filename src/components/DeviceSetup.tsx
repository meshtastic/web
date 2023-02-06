import { useDeviceStore } from "@app/core/stores/deviceStore";
import { DeviceWrapper } from "@app/DeviceWrapper";
import { PageNav, pagesSetup } from "@app/Nav/PageNav";
import { PageRouter } from "@app/PageRouter";
import { ConfigPage } from "@app/pages/Config";
import { Mono } from "./generic/Mono";
// import { PageNav, pagesDevice, pagesSetup } from "./PageNav";
import { SidebarSetup } from "./SidebarSetup";



export const DeviceSetup = (): JSX.Element => {
    const { getDevices } = useDeviceStore();
    const testDevice = getDevices()[0];

    if(!testDevice)
        return (<Mono>Currently needs at least one device.</Mono>)

    return (
        <DeviceWrapper device={testDevice}>            
        <div className="flex flex-grow">
            { <SidebarSetup/> }
            { <PageRouter/> }
        </div>            
            {/* { <PageNav p={pagesSetup}/> } */}            
        </DeviceWrapper>
    );
}