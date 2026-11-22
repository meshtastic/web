import { describe, expect, it } from "vitest";
import { transportSupport } from "./capabilities.ts";
import {
  effectiveUseHttps,
  initWizard,
  stepInfo,
  type WizardEvent,
  type WizardState,
  type WizardStep,
  wizardReducer,
} from "./wizard.ts";

const full = transportSupport({ bluetooth: true, serial: true });
const httpOnly = transportSupport({ bluetooth: false, serial: false });

const run = (state: WizardState, ...events: WizardEvent[]): WizardState =>
  events.reduce(wizardReducer, state);

const fresh = (support = full) => initWizard({ support });

const at = (step: WizardStep, support = full): WizardState => ({
  ...fresh(support),
  step,
});

describe("initWizard", () => {
  it("starts at welcome with the first available method", () => {
    const state = fresh();
    expect(state.step).toEqual({ name: "welcome" });
    expect(state.method).toBe("bluetooth");
    expect(state.httpAddress).toBe("meshtastic.local");
  });

  it("preselects HTTP when Bluetooth and USB are unavailable", () => {
    expect(fresh(httpOnly).method).toBe("http");
  });

  it("resumes at sync while a connection is in progress", () => {
    const state = initWizard({ support: full, connecting: true });
    expect(state.step).toEqual({ name: "sync" });
  });
});

describe("wizardReducer", () => {
  it("walks the Bluetooth happy path", () => {
    const state = run(
      fresh(),
      { type: "start", connected: false },
      { type: "connectRequested" },
    );
    expect(state.step).toEqual({ name: "pairing", picker: "open" });
    const synced = run(
      state,
      { type: "devicePicked" },
      { type: "continue" },
      { type: "setUpNew" },
      { type: "profileSaved" },
      { type: "channelDone" },
    );
    expect(synced.step).toEqual({
      name: "done",
      skipped: false,
      returnTo: { name: "channel" },
    });
  });

  it("goes straight to sync when a radio is already connected", () => {
    expect(run(fresh(), { type: "start", connected: true }).step).toEqual({
      name: "sync",
    });
  });

  it("connects over HTTP without a picker", () => {
    const state = run(
      fresh(),
      { type: "start", connected: false },
      { type: "selectMethod", method: "http" },
      { type: "connectRequested" },
    );
    expect(state.step).toEqual({ name: "sync" });
  });

  it("refuses an unavailable method", () => {
    const state = run(at({ name: "connect" }, httpOnly), {
      type: "selectMethod",
      method: "bluetooth",
    });
    expect(state.method).toBe("http");
  });

  it("ignores method changes outside the connect step", () => {
    const state = run(fresh(), { type: "selectMethod", method: "serial" });
    expect(state.method).toBe("bluetooth");
  });

  it("keeps the pairing screen after the picker is cancelled", () => {
    const state = run(at({ name: "pairing", picker: "open" }), {
      type: "pickerCancelled",
    });
    expect(state.step).toEqual({ name: "pairing", picker: "closed" });
    expect(stepInfo(state.step).next).toBe("searchAgain");
    expect(run(state, { type: "retry" }).step).toEqual({
      name: "pairing",
      picker: "open",
    });
  });

  it("does not retry while the picker is still open", () => {
    const state = at({ name: "pairing", picker: "open" });
    expect(run(state, { type: "retry" })).toBe(state);
  });

  it("reports failures from pairing and sync with their detail", () => {
    for (const step of [
      { name: "pairing", picker: "open" },
      { name: "sync" },
    ] as const) {
      expect(
        run(at(step), { type: "connectFailed", detail: "GATT error" }).step,
      ).toEqual({ name: "pairingError", detail: "GATT error" });
    }
  });

  it("ignores a late failure once past sync", () => {
    const state = at({ name: "profile" });
    expect(run(state, { type: "connectFailed" })).toBe(state);
  });

  it("opens the error screen when the radio is not listed", () => {
    expect(
      run(at({ name: "pairing", picker: "closed" }), { type: "radioNotListed" })
        .step,
    ).toEqual({ name: "pairingError" });
  });

  it("retries the same method from the error screen", () => {
    const bt = at({ name: "pairingError" });
    expect(run(bt, { type: "retry" }).step).toEqual({
      name: "pairing",
      picker: "open",
    });
    const http = { ...at({ name: "pairingError" }), method: "http" as const };
    expect(run(http, { type: "retry" }).step).toEqual({ name: "sync" });
  });

  it("goes back along the design's back links", () => {
    const cases: Array<[WizardStep, WizardStep | undefined]> = [
      [{ name: "welcome" }, undefined],
      [{ name: "connect" }, { name: "welcome" }],
      [{ name: "pairing", picker: "closed" }, { name: "connect" }],
      [{ name: "pairingError" }, { name: "connect" }],
      [{ name: "sync" }, undefined],
      [{ name: "restore", view: "choose", choice: "new" }, { name: "sync" }],
      [
        { name: "restore", view: "review" },
        { name: "restore", view: "choose", choice: "restore" },
      ],
      [{ name: "profile" }, { name: "restore", view: "choose", choice: "new" }],
      [{ name: "channel" }, { name: "profile" }],
    ];
    for (const [from, to] of cases) {
      const state = at(from);
      const next = run(state, { type: "back" });
      expect(next.step).toEqual(to ?? from);
    }
  });

  it("skips to done and returns to a stable step", () => {
    const skipped = run(at({ name: "pairing", picker: "closed" }), {
      type: "skip",
    });
    expect(skipped.step).toEqual({
      name: "done",
      skipped: true,
      returnTo: { name: "connect" },
    });
    expect(run(skipped, { type: "back" }).step).toEqual({ name: "connect" });
    expect(run(skipped, { type: "skip" })).toBe(skipped);
  });

  it("keeps the HTTP fields across steps", () => {
    const state = run(
      fresh(),
      { type: "setHttpAddress", value: "192.168.1.50" },
      { type: "setUseHttps", value: true },
      { type: "start", connected: false },
    );
    expect(state.httpAddress).toBe("192.168.1.50");
    expect(state.useHttps).toBe(true);
  });

  it("cancels a connect that hasn't answered, only from sync", () => {
    expect(run(at({ name: "sync" }), { type: "cancelConnect" }).step).toEqual({
      name: "connect",
    });
    const profile = at({ name: "profile" });
    expect(run(profile, { type: "cancelConnect" })).toBe(profile);
  });

  it("asks new or restore once the radio has synced", () => {
    expect(run(at({ name: "sync" }), { type: "continue" }).step).toEqual({
      name: "restore",
      view: "choose",
      choice: "new",
    });
  });

  it("sets up as new from the choice", () => {
    const state = run(
      at({ name: "restore", view: "choose", choice: "new" }),
      { type: "selectRestoreChoice", choice: "restore" },
      { type: "selectRestoreChoice", choice: "new" },
      { type: "setUpNew" },
    );
    expect(state.step).toEqual({ name: "profile" });
  });

  it("reviews a loaded backup file", () => {
    const state = run(at({ name: "restore", view: "choose", choice: "new" }), {
      type: "selectRestoreChoice",
      choice: "restore",
    });
    expect(state.step).toEqual({
      name: "restore",
      view: "choose",
      choice: "restore",
    });
    expect(run(state, { type: "restoreFileLoaded" }).step).toEqual({
      name: "restore",
      view: "review",
    });
  });

  it("only changes the choice on the choice view", () => {
    const review = at({ name: "restore", view: "review" });
    expect(run(review, { type: "selectRestoreChoice", choice: "new" })).toBe(
      review,
    );
  });

  it("skips profile and channel after a restore", () => {
    const state = run(at({ name: "restore", view: "review" }), {
      type: "restored",
      regionUnset: false,
    });
    expect(state.step).toEqual({
      name: "done",
      skipped: false,
      returnTo: { name: "restore", view: "choose", choice: "new" },
    });
    expect(run(state, { type: "back" }).step).toEqual({
      name: "restore",
      view: "choose",
      choice: "new",
    });
  });

  it("asks for a region when the restore left none", () => {
    const state = run(at({ name: "restore", view: "review" }), {
      type: "restored",
      regionUnset: true,
    });
    expect(state.step).toEqual({ name: "profile" });
  });

  it("ignores restore events outside the restore step", () => {
    const profile = at({ name: "profile" });
    expect(run(profile, { type: "restored", regionUnset: false })).toBe(
      profile,
    );
    expect(run(profile, { type: "setUpNew" })).toBe(profile);
    expect(run(profile, { type: "restoreFileLoaded" })).toBe(profile);
  });

  it("skips setup from the restore step, coming back to the choice", () => {
    const skipped = run(at({ name: "restore", view: "review" }), {
      type: "skip",
    });
    expect(skipped.step).toEqual({
      name: "done",
      skipped: true,
      returnTo: { name: "restore", view: "choose", choice: "new" },
    });
  });

  it("only saves a profile from the profile step", () => {
    const state = at({ name: "sync" });
    expect(run(state, { type: "profileSaved" })).toBe(state);
  });
});

describe("stepInfo", () => {
  it("numbers the six dots and names the actions", () => {
    expect(stepInfo({ name: "welcome" })).toMatchObject({
      number: 1,
      next: "getStarted",
      back: undefined,
    });
    expect(stepInfo({ name: "connect" })).toMatchObject({
      number: 2,
      label: "connect",
      back: "back",
    });
    expect(stepInfo({ name: "pairing", picker: "open" })).toMatchObject({
      number: 2,
      next: undefined,
      back: "cancel",
    });
    expect(stepInfo({ name: "pairingError" })).toMatchObject({
      next: "tryAgain",
      back: "useAnotherMethod",
    });
    expect(stepInfo({ name: "sync" })).toMatchObject({
      number: 2,
      back: undefined,
    });
    expect(
      stepInfo({ name: "restore", view: "choose", choice: "new" }),
    ).toMatchObject({
      number: 3,
      label: "restore",
      next: "setUpNew",
      back: "back",
      secondary: undefined,
    });
    expect(
      stepInfo({ name: "restore", view: "choose", choice: "restore" }),
    ).toMatchObject({ number: 3, next: "chooseFile" });
    expect(stepInfo({ name: "restore", view: "review" })).toMatchObject({
      number: 3,
      next: "restoreAndContinue",
      back: "back",
      secondary: "chooseAnotherFile",
    });
    expect(stepInfo({ name: "profile" })).toMatchObject({
      number: 4,
      next: "saveAndContinue",
    });
    expect(stepInfo({ name: "channel" })).toMatchObject({
      number: 5,
      next: "addChannel",
      secondary: "skipForNow",
    });
    expect(
      stepInfo({ name: "done", skipped: true, returnTo: { name: "welcome" } }),
    ).toMatchObject({ number: 6, next: "openWebClient", back: "back" });
  });
});

describe("effectiveUseHttps", () => {
  const page = { pageIsHttps: true, httpsRequired: false };
  const state = (httpAddress: string, useHttps?: boolean) => ({
    httpAddress,
    useHttps,
  });

  it("defaults local radios to HTTP and other hosts to the page's scheme", () => {
    expect(effectiveUseHttps(state("meshtastic.local"), page)).toBe(false);
    expect(effectiveUseHttps(state("192.168.1.50"), page)).toBe(false);
    expect(effectiveUseHttps(state("radio.example.com"), page)).toBe(true);
    expect(
      effectiveUseHttps(state("radio.example.com"), {
        pageIsHttps: false,
        httpsRequired: false,
      }),
    ).toBe(false);
  });

  it("follows the user's choice once set", () => {
    expect(effectiveUseHttps(state("meshtastic.local", true), page)).toBe(true);
    expect(effectiveUseHttps(state("radio.example.com", false), page)).toBe(
      false,
    );
  });

  it("forces HTTPS where plain HTTP is blocked", () => {
    expect(
      effectiveUseHttps(state("meshtastic.local", false), {
        pageIsHttps: true,
        httpsRequired: true,
      }),
    ).toBe(true);
  });
});
