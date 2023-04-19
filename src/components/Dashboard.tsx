import {
  useState
} from 'react';

import {
  ConfigPreset,
  useAppStore,
} from '@app/core/stores/appStore.js';
import { DeviceConfig } from '@app/pages/Config/DeviceConfig';
import { Separator } from '@components/UI/Seperator.js';
import { H3 } from '@components/UI/Typography/H3.js';
import { Subtle } from '@components/UI/Typography/Subtle.js';

import { ConfigList } from './PageComponents/Flasher/ConfigList';
import { DeviceList } from './PageComponents/Flasher/DeviceList';
import { ConfigTabs } from '@app/pages/Config/ConfigTabs';

export const Dashboard = () => {
  let { configPresetRoot, configPresetSelected, overallFlashingState } = useAppStore();
  const getTotalConfigCount = (c: ConfigPreset): number => c.children.map(child => getTotalConfigCount(child)).reduce((prev, cur) => prev + cur, c.count);  
  const [ totalConfigCount, setTotalConfigCount ] = useState(configPresetRoot.getTotalConfigCount()); 

  return (
    <div className="flex flex-col h-full gap-3 p-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <H3>Connected Devices</H3>
          <Subtle>Manage, connect and disconnect devices</Subtle>
        </div>
      </div>

      <Separator />

      <div className="flex w-full h-full gap-3 overflow-auto">
        <DeviceList rootConfig={configPresetRoot} totalConfigCount={totalConfigCount}/>
        <ConfigList rootConfig={configPresetRoot} setTotalConfigCountDiff={(diff) => setTotalConfigCount(totalConfigCount + diff)}/>
        <div className="flex h-full overflow-auto w-full relative"><ConfigTabs key={configPresetSelected?.name}/></div>
      </div>
    </div>
  );
};




