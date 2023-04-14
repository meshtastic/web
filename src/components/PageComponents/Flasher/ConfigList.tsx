import { ConfigSelectButton } from "@app/components/UI/ConfigSelectButton";
import { useToast } from "@app/core/hooks/useToast";
import { ConfigPreset, useAppStore } from "@app/core/stores/appStore";
import { PlusIcon, Edit3Icon, Trash2Icon, UploadIcon, DownloadIcon } from "lucide-react";
import { useState } from "react";

export const ConfigList = ({rootConfig, setTotalConfigCountDiff}: {rootConfig: ConfigPreset, setTotalConfigCountDiff: (val: number) => void}) => {
    const { configPresetRoot, setConfigPresetRoot, configPresetSelected, setConfigPresetSelected } = useAppStore();
    const [ editSelected, setEditSelected ] = useState(false);
    const { toast } = useToast();
    if(configPresetSelected === undefined) {
        setConfigPresetSelected(configPresetRoot);
        return (<div/>);    
    }

    return (
        <div className="flex flex-col min-w-[400px] rounded-md border border-dashed border-slate-200 p-3 mb-2 dark:border-slate-700">
        <div className="flex justify-between">
            <div className="flex gap-2">
            <button        
                className="transition-all hover:text-accent mb-4"
                title="Add new configuration as child"
                onClick={() => {         
                const newPreset = new ConfigPreset("New Preset", configPresetSelected);
                configPresetSelected?.children.push(newPreset);          
                setConfigPresetRoot(Object.create(configPresetRoot));
                setConfigPresetSelected(newPreset);
                setEditSelected(true);
                newPreset.saveConfigTree();
                }}
            >
                <PlusIcon/>
            </button>
            <button        
                className="transition-all hover:text-accent mb-4"
                title="Rename"
                onClick={() => {                     
                setEditSelected(true);
                }}
            >
                <Edit3Icon/>
            </button>
            <button        
                className="transition-all hover:text-accent mb-4"
                title="Delete"
                onClick={() => {                     
                if(configPresetSelected.parent === undefined) {
                    if(!confirm(`Are you sure you want to reset the preset list to default?`))
                    return;
                    const newDefault = new ConfigPreset("Default");
                    setConfigPresetRoot(newDefault);
                    newDefault.saveConfigTree();
                    return;
                } 
                // TEMP: Replace with proper dialog.
                if(!confirm(`Are you sure you want to remove "${configPresetSelected.name}" and all its children?`))
                    return;
                configPresetSelected.parent.children = configPresetSelected.parent.children.filter(c => c != configPresetSelected);
                setConfigPresetSelected(configPresetSelected.parent);
                configPresetSelected.saveConfigTree();            
                }}
            >
                <Trash2Icon/>
            </button>
            </div>
            <div className="flex gap-2">
            <button        
                className="transition-all hover:text-accent mb-4"
                title="Import"
                onClick={() => {                     
                ConfigPreset.importConfigTree().then(
                    (root) => {
                    if(root) {
                        setConfigPresetRoot(root);
                        root.saveConfigTree();
                        toast({
                        title: `Presets successfully imported.`
                        });
                    }
                    },
                    () => {toast({
                    title: `This is not a valid configuration file.`
                    });}
                );
                }}
            >
            <UploadIcon/> 
            </button>
            <button        
                className="transition-all hover:text-accent mb-4"
                title="Export"
                onClick={() => {                     
                rootConfig.exportConfigTree();
                }}
            >
            <DownloadIcon/> 
            </button>
            </div>
            
        </div>
        
        <div className='overflow-y-auto'>
        {rootConfig &&
            <ConfigEntry
            config={rootConfig}
            configPresetSelected={configPresetSelected}
            setConfigPresetSelected={setConfigPresetSelected}
            editSelected={editSelected}
            onConfigCountChanged={(val, diff) => setTotalConfigCountDiff(diff)}
            onEditDone={(val) => {
                configPresetSelected.name = val;
                setEditSelected(false);
                configPresetSelected.saveConfigTree();
            }
            }
            />
        }</div>
        </div>
    );

};

const ConfigEntry = ({config, configPresetSelected, setConfigPresetSelected, editSelected, onEditDone, onConfigCountChanged}:
{config: ConfigPreset,
    configPresetSelected: ConfigPreset,
    setConfigPresetSelected: (selection: ConfigPreset) => void,
    editSelected: boolean, onEditDone: (value: string) => void,
    onConfigCountChanged: (val: number, diff: number) => void
}) => {
    const [configCount, setConfigCount] = useState(config.count);
    return (
        <div>
        <ConfigSelectButton
        label={config.name}
        active={config == configPresetSelected}
        setValue={(value) => {const diff = value - config.count; config.count = value; setConfigCount(value); onConfigCountChanged(value, diff);}}
        value={configCount}
        editing={editSelected && config == configPresetSelected}
        onClick={() => setConfigPresetSelected(config)}
        onChangeDone={onEditDone}
        />
        <div className="ml-[20px]">
            {config.children.map(c =>
                (<ConfigEntry
                config={c}
                configPresetSelected={configPresetSelected}
                setConfigPresetSelected={setConfigPresetSelected}
                editSelected={editSelected}
                onEditDone={onEditDone}
                onConfigCountChanged={onConfigCountChanged}
                />)
            )}
        </div>
        </div>
    );
}