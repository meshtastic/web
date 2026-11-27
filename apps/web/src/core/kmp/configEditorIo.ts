import { editSettings, sendAdmin } from "./admin.ts";
import { Result } from "better-result";
import { ConfigEditor, type ConfigEditorIo } from "./configEditor.ts";
import { moduleMessagesFor } from "./moduleMessages.ts";
import type { MeshSession } from "./session.ts";

/** The editor's device access through a session over the Kotlin SDK. */
export function sessionIo(session: MeshSession): ConfigEditorIo {
  return {
    onConfig: (cb) => session.events.onConfigPacket.subscribe(cb),
    onModuleConfig: (cb) => session.events.onModuleConfigPacket.subscribe(cb),
    onChannel: (cb) => session.events.onChannelPacket.subscribe(cb),
    onDisconnect: (cb) =>
      session.events.onConnectionState.subscribe((state) => {
        if (state.kind === "disconnected") cb();
      }),
    commit: async (messages) => {
      session.events.onPendingSettingsChange.dispatch(true);
      try {
        return await editSettings(session.kmp, messages);
      } finally {
        session.events.onPendingSettingsChange.dispatch(false);
      }
    },
    send: async (message) => {
      session.events.onPendingSettingsChange.dispatch(true);
      try {
        const result = await sendAdmin(session.kmp, message.payloadVariant);
        return Result.isError(result)
          ? Result.err(result.error)
          : Result.ok(undefined);
      } finally {
        session.events.onPendingSettingsChange.dispatch(false);
      }
    },
  };
}

const editors = new WeakMap<MeshSession, ConfigEditor>();

/** The one editor for a session, created on first use. */
export function editorFor(session: MeshSession): ConfigEditor {
  const existing = editors.get(session);
  if (existing) return existing;
  const messages = moduleMessagesFor(session);
  const editor = new ConfigEditor(sessionIo(session), {
    onStagedAdminMessageCommitted: (message) => messages.applySent(message),
  });
  editors.set(session, editor);
  return editor;
}
