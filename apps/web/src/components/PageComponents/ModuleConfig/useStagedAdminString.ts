import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useCallback } from "react";

/**
 * Settings the device keeps outside ModuleConfig, each read and written
 * through its own admin message.
 */
export type AdminStringKey = "cannedMessages" | "ringtone";

type SetCase = "setCannedMessageModuleMessages" | "setRingtoneMessage";

const SET_CASE: Record<AdminStringKey, SetCase> = {
  cannedMessages: "setCannedMessageModuleMessages",
  ringtone: "setRingtoneMessage",
};

const EMPTY_STAGED_SIGNAL = {
  value: new Map() as ReadonlyMap<string, Protobuf.Admin.AdminMessage>,
  peek: () => new Map() as ReadonlyMap<string, Protobuf.Admin.AdminMessage>,
  subscribe: () => () => {},
} as const;

function setMessage(key: AdminStringKey, value: string) {
  const payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"] =
    key === "cannedMessages"
      ? { case: "setCannedMessageModuleMessages", value }
      : { case: "setRingtoneMessage", value };
  return create(Protobuf.Admin.AdminMessageSchema, { payloadVariant });
}

/**
 * The value a form should show for one of these settings, and a function
 * that stages an edit to it. The edit is sent with the page's Save, inside
 * the same begin/commit edit as the module config. Staging the device's own
 * value drops the edit, so the page isn't left dirty.
 *
 * Nothing is staged until the device has answered, so an untouched field
 * can never overwrite a value we haven't read.
 */
export function useStagedAdminString(
  key: AdminStringKey,
  deviceValue: string | undefined,
): { value: string | undefined; stage: (value: string) => void } {
  const editor = useConfigEditor();
  const staged = useSignal(editor?.stagedAdminMessages ?? EMPTY_STAGED_SIGNAL);
  const variant = staged.get(key)?.payloadVariant;
  const stagedValue =
    variant?.case === SET_CASE[key] ? (variant.value as string) : undefined;

  const stage = useCallback(
    (value: string) => {
      if (!editor || deviceValue === undefined) return;
      editor.stageAdminMessage(
        key,
        value === deviceValue ? undefined : setMessage(key, value),
      );
    },
    [editor, key, deviceValue],
  );

  return { value: stagedValue ?? deviceValue, stage };
}
