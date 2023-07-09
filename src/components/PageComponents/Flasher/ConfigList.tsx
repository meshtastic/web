import { ConfigSelectButton } from "@app/components/UI/ConfigSelectButton";
import { useToast } from "@app/core/hooks/useToast";
import { ConfigPreset, useAppStore } from "@app/core/stores/appStore";
import {
  PlusIcon,
  Edit3Icon,
  Trash2Icon,
  UploadIcon,
  DownloadIcon
} from "lucide-react";
import { useState } from "react";

export const ConfigList = ({
  rootConfig,
  setTotalConfigCountDiff
}: {
  rootConfig: ConfigPreset;
  setTotalConfigCountDiff: (val: number) => void;
}) => {
  const {
    configPresetRoot,
    setConfigPresetRoot,
    configPresetSelected,
    setConfigPresetSelected,
    overallFlashingState
  } = useAppStore();
  const [editSelected, setEditSelected] = useState(false);
  const { toast } = useToast();
  if (configPresetSelected === undefined) {
    setConfigPresetSelected(configPresetRoot);
    return <div />;
  }
  const disabled = overallFlashingState.state == "busy";

  return (
    <div className="flex w-full min-w-[250px] flex-col rounded-md border border-dashed border-slate-200 px-2 py-3 dark:border-slate-700">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            className="mb-4 transition-all hover:text-accent"
            title="Add new configuration as child"
            onClick={() => {
              const newPreset = new ConfigPreset(
                "New Preset",
                configPresetSelected
              );
              configPresetSelected?.children.push(newPreset);
              setConfigPresetRoot(configPresetRoot.shallowClone());
              setConfigPresetSelected(newPreset);
              setEditSelected(true);
              newPreset.saveConfigTree();
            }}
            disabled={disabled}
          >
            <PlusIcon />
          </button>
          <button
            className="mb-4 transition-all hover:text-accent"
            title="Rename"
            onClick={() => {
              setEditSelected(true);
            }}
            disabled={disabled}
          >
            <Edit3Icon />
          </button>
          <button
            className="mb-4 transition-all hover:text-accent"
            title="Delete"
            onClick={() => {
              if (configPresetSelected.parent === undefined) {
                if (
                  !confirm(
                    `Are you sure you want to reset the preset list to default?`
                  )
                )
                  return;
                const newDefault = new ConfigPreset("Default");
                setConfigPresetRoot(newDefault);
                newDefault.saveConfigTree();
                return;
              }
              if (
                !confirm(
                  `Are you sure you want to remove "${configPresetSelected.name}" and all its children?`
                )
              )
                return;
              configPresetSelected.parent.children =
                configPresetSelected.parent.children.filter(
                  (c) => c != configPresetSelected
                );
              setConfigPresetSelected(configPresetSelected.parent);
              configPresetSelected.saveConfigTree();
            }}
            disabled={disabled}
          >
            <Trash2Icon />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="mb-4 transition-all hover:text-accent"
            title="Import"
            onClick={() => {
              ConfigPreset.importConfigTree().then(
                (root) => {
                  if (root) {
                    let newEntry = root;
                    debugger;
                    if (configPresetSelected.parent) {
                      const childIndex =
                        configPresetSelected.parent.children.indexOf(
                          configPresetSelected
                        );
                      configPresetSelected.parent.children[childIndex] = root;
                      root.parent = configPresetSelected.parent;
                      newEntry = root;
                      setConfigPresetRoot(configPresetRoot.shallowClone());
                    } else {
                      root.overrideValues = undefined;
                      setConfigPresetRoot(root);
                    }
                    setConfigPresetSelected(newEntry);
                    root.saveConfigTree();
                    toast({
                      title: `Presets successfully imported.`
                    });
                  }
                },
                () => {
                  toast({
                    title: `This is not a valid configuration file.`
                  });
                }
              );
            }}
            disabled={disabled}
          >
            <UploadIcon />
          </button>
          <button
            className="mb-4 transition-all hover:text-accent"
            title="Export"
            onClick={() => {
              configPresetSelected.exportConfigTree();
            }}
            disabled={disabled}
          >
            <DownloadIcon />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {rootConfig && (
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
            }}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
};

const ConfigEntry = ({
  config,
  configPresetSelected,
  setConfigPresetSelected,
  editSelected,
  onEditDone,
  onConfigCountChanged,
  disabled
}: {
  config: ConfigPreset;
  configPresetSelected: ConfigPreset;
  setConfigPresetSelected: (selection: ConfigPreset) => void;
  editSelected: boolean;
  onEditDone: (value: string) => void;
  onConfigCountChanged: (val: number, diff: number) => void;
  disabled: boolean;
}) => {
  const [configCount, setConfigCount] = useState(config.count);
  return (
    <div>
      <ConfigSelectButton
        label={config.name}
        active={config == configPresetSelected}
        setValue={(value) => {
          const diff = value - config.count;
          config.count = value;
          setConfigCount(value);
          onConfigCountChanged(value, diff);
        }}
        value={configCount}
        editing={editSelected && config == configPresetSelected}
        onClick={() => setConfigPresetSelected(config)}
        onChangeDone={onEditDone}
        disabled={disabled}
      />
      <div className="ml-[20px]">
        {config.children.map((c) => (
          <ConfigEntry
            config={c}
            configPresetSelected={configPresetSelected}
            setConfigPresetSelected={setConfigPresetSelected}
            editSelected={editSelected}
            onEditDone={onEditDone}
            onConfigCountChanged={onConfigCountChanged}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
