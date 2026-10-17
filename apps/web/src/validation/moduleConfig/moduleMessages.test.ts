import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { CannedMessageValidationSchema } from "./cannedMessage.ts";
import { ExternalNotificationValidationSchema } from "./externalNotification.ts";

const InputEvent =
  Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar;

const canned = {
  rotary1Enabled: false,
  inputbrokerPinA: 0,
  inputbrokerPinB: 0,
  inputbrokerPinPress: 0,
  inputbrokerEventCw: InputEvent.NONE,
  inputbrokerEventCcw: InputEvent.NONE,
  inputbrokerEventPress: InputEvent.NONE,
  updown1Enabled: false,
  enabled: true,
  allowInputSource: "",
  sendBell: false,
  messages: "Hi|Bye",
};

const notification = {
  enabled: true,
  outputMs: 0,
  output: 0,
  outputVibra: 0,
  outputBuzzer: 0,
  active: false,
  alertMessage: false,
  alertMessageVibra: false,
  alertMessageBuzzer: false,
  alertBell: false,
  alertBellVibra: false,
  alertBellBuzzer: false,
  usePwm: false,
  nagTimeout: 0,
  useI2sAsBuzzer: false,
  ringtone: "24:d=32,o=5,b=565:f6,p,f6",
};

describe("canned messages", () => {
  it("allows 200 bytes of messages, counted in UTF-8", () => {
    const parse = (messages: string) =>
      CannedMessageValidationSchema.safeParse({ ...canned, messages });
    expect(parse("a".repeat(200)).success).toBe(true);
    const tooLong = parse("é".repeat(101));
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toBe(
      "formValidation.tooBig.bytes",
    );
  });
});

describe("ringtone", () => {
  it("allows 230 bytes", () => {
    const parse = (ringtone: string) =>
      ExternalNotificationValidationSchema.safeParse({
        ...notification,
        ringtone,
      }).success;
    expect(parse(notification.ringtone)).toBe(true);
    expect(parse("a".repeat(230))).toBe(true);
    expect(parse("a".repeat(231))).toBe(false);
  });
});
