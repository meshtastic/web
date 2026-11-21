import { isLocalNetworkHost } from "@pages/Connections/utils.ts";
import {
  type ConnectMethod,
  type TransportSupport,
  isMethodAvailable,
} from "./capabilities.ts";

/**
 * The onboarding wizard as a pure state machine: welcome → connect →
 * pairing → sync → restore → profile → channel → done, with the
 * pairing-error side state. A restore from a backup file skips profile and
 * channel unless it leaves the radio without a region. Skip jumps to done from anywhere. Components dispatch events and
 * run the side effects (pickers, connects, saves) the transitions call for.
 */

export type PickerState = "open" | "closed";

/** Set up as a new radio, or restore a backup file onto it. */
export type RestoreChoice = "new" | "restore";

export type WizardStep =
  | { readonly name: "welcome" }
  | { readonly name: "connect" }
  /** The browser's Bluetooth or USB picker is (or was just) showing. */
  | { readonly name: "pairing"; readonly picker: PickerState }
  /** The connect failed; `detail` is the browser's or SDK's message. */
  | { readonly name: "pairingError"; readonly detail?: string }
  /** Connected or connecting; the radio streams its config and nodes. */
  | { readonly name: "sync" }
  /** Choosing new or restore, then reviewing the picked file. */
  | {
      readonly name: "restore";
      readonly view: "choose";
      readonly choice: RestoreChoice;
    }
  | { readonly name: "restore"; readonly view: "review" }
  | { readonly name: "profile" }
  | { readonly name: "channel" }
  /** `skipped` when Skip setup got here; Back returns to `returnTo`. */
  | {
      readonly name: "done";
      readonly skipped: boolean;
      readonly returnTo: ReturnStep;
    };

export type WizardStepName = WizardStep["name"];

/** Steps Back can return to from done. Transient states map to connect. */
export type ReturnStep =
  | Extract<
      WizardStep,
      { name: "welcome" | "connect" | "sync" | "profile" | "channel" }
    >
  | RestoreChooseStep;

type RestoreChooseStep = Extract<
  WizardStep,
  { name: "restore"; view: "choose" }
>;

const RESTORE_CHOICE: RestoreChooseStep = {
  name: "restore",
  view: "choose",
  choice: "new",
};

export interface WizardState {
  readonly step: WizardStep;
  readonly method: ConnectMethod;
  readonly support: TransportSupport;
  readonly httpAddress: string;
  /** The HTTPS switch as the user set it; undefined follows the default. */
  readonly useHttps: boolean | undefined;
}

export type WizardEvent =
  /** Get started; an already connected radio skips straight to sync. */
  | { readonly type: "start"; readonly connected: boolean }
  | { readonly type: "selectMethod"; readonly method: ConnectMethod }
  | { readonly type: "setHttpAddress"; readonly value: string }
  | { readonly type: "setUseHttps"; readonly value: boolean }
  /** Connect pressed: a picker opens (BT/USB) or the HTTP connect starts. */
  | { readonly type: "connectRequested" }
  | { readonly type: "pickerCancelled" }
  | { readonly type: "devicePicked" }
  | { readonly type: "connectFailed"; readonly detail?: string }
  | { readonly type: "radioNotListed" }
  /** Try again from pairing error, or search again after a cancel. */
  | { readonly type: "retry" }
  /** Cancel while the radio hasn't answered yet; back to the options. */
  | { readonly type: "cancelConnect" }
  | { readonly type: "continue" }
  | { readonly type: "selectRestoreChoice"; readonly choice: RestoreChoice }
  /** Set up as new: on to the profile step. */
  | { readonly type: "setUpNew" }
  /** A backup file was read; review what it holds. */
  | { readonly type: "restoreFileLoaded" }
  /**
   * The backup was written. `regionUnset` when the radio still has no
   * LoRa region afterwards, so the profile step must ask for one.
   */
  | { readonly type: "restored"; readonly regionUnset: boolean }
  | { readonly type: "profileSaved" }
  | { readonly type: "channelDone" }
  | { readonly type: "back" }
  | { readonly type: "skip" };

export interface WizardInit {
  readonly support: TransportSupport;
  /** Resume at sync when a connection is already in progress. */
  readonly connecting?: boolean;
  readonly httpAddress?: string;
}

export const DEFAULT_HTTP_ADDRESS = "meshtastic.local";

export function initWizard(init: WizardInit): WizardState {
  return {
    step: init.connecting ? { name: "sync" } : { name: "welcome" },
    method: init.support.defaultMethod,
    support: init.support,
    httpAddress: init.httpAddress ?? DEFAULT_HTTP_ADDRESS,
    useHttps: undefined,
  };
}

export interface HttpsContext {
  /** This page was served over HTTPS. */
  readonly pageIsHttps: boolean;
  /** The browser can't reach plain HTTP radios from this page. */
  readonly httpsRequired: boolean;
}

/**
 * Whether to connect over HTTPS. Forced where plain HTTP is blocked;
 * otherwise the user's choice, defaulting (like the Connections form) to
 * HTTP for local radios, which have no trusted certificate, and to HTTPS
 * for other hosts when the page itself is HTTPS.
 */
export function effectiveUseHttps(
  state: Pick<WizardState, "useHttps" | "httpAddress">,
  context: HttpsContext,
): boolean {
  if (context.httpsRequired) return true;
  if (state.useHttps !== undefined) return state.useHttps;
  const host = state.httpAddress.trim().replace(/^https?:\/\//i, "");
  return context.pageIsHttps && !isLocalNetworkHost(host);
}

/** The step a Connect press (or a retry) leads to for `method`. */
const attemptStep = (method: ConnectMethod): WizardStep =>
  method === "http" ? { name: "sync" } : { name: "pairing", picker: "open" };

const toReturnStep = (step: WizardStep): ReturnStep => {
  switch (step.name) {
    case "welcome":
    case "connect":
    case "sync":
    case "profile":
    case "channel":
      return step;
    case "restore":
      // A reviewed file lives in the step's view; coming back starts over.
      return RESTORE_CHOICE;
    case "pairing":
    case "pairingError":
      return { name: "connect" };
    case "done":
      return step.returnTo;
  }
};

const backStep = (step: WizardStep): WizardStep | undefined => {
  switch (step.name) {
    case "welcome":
    case "sync":
      return undefined;
    case "connect":
      return { name: "welcome" };
    case "pairing":
    case "pairingError":
      return { name: "connect" };
    case "restore":
      return step.view === "review" ? RESTORE_CHOICE_RESTORE : { name: "sync" };
    case "profile":
      return RESTORE_CHOICE;
    case "channel":
      return { name: "profile" };
    case "done":
      return step.returnTo;
  }
};

const RESTORE_CHOICE_RESTORE: RestoreChooseStep = {
  name: "restore",
  view: "choose",
  choice: "restore",
};

const withStep = (state: WizardState, step: WizardStep): WizardState => ({
  ...state,
  step,
});

export function wizardReducer(
  state: WizardState,
  event: WizardEvent,
): WizardState {
  const { step } = state;
  switch (event.type) {
    case "start":
      return step.name === "welcome"
        ? withStep(
            state,
            event.connected ? { name: "sync" } : { name: "connect" },
          )
        : state;
    case "selectMethod":
      return step.name === "connect" &&
        isMethodAvailable(state.support, event.method)
        ? { ...state, method: event.method }
        : state;
    case "setHttpAddress":
      return { ...state, httpAddress: event.value };
    case "setUseHttps":
      return { ...state, useHttps: event.value };
    case "connectRequested":
      return step.name === "connect" &&
        isMethodAvailable(state.support, state.method)
        ? withStep(state, attemptStep(state.method))
        : state;
    case "pickerCancelled":
      return step.name === "pairing"
        ? withStep(state, { name: "pairing", picker: "closed" })
        : state;
    case "devicePicked":
      return step.name === "pairing"
        ? withStep(state, { name: "sync" })
        : state;
    case "connectFailed":
      return step.name === "pairing" || step.name === "sync"
        ? withStep(state, { name: "pairingError", detail: event.detail })
        : state;
    case "radioNotListed":
      return step.name === "pairing"
        ? withStep(state, { name: "pairingError" })
        : state;
    case "retry":
      return step.name === "pairingError" ||
        (step.name === "pairing" && step.picker === "closed")
        ? withStep(state, attemptStep(state.method))
        : state;
    case "cancelConnect":
      return step.name === "sync"
        ? withStep(state, { name: "connect" })
        : state;
    case "continue":
      return step.name === "sync" ? withStep(state, RESTORE_CHOICE) : state;
    case "selectRestoreChoice":
      return step.name === "restore" && step.view === "choose"
        ? withStep(state, { ...step, choice: event.choice })
        : state;
    case "setUpNew":
      return step.name === "restore"
        ? withStep(state, { name: "profile" })
        : state;
    case "restoreFileLoaded":
      return step.name === "restore"
        ? withStep(state, { name: "restore", view: "review" })
        : state;
    case "restored":
      if (step.name !== "restore") return state;
      return withStep(
        state,
        event.regionUnset
          ? { name: "profile" }
          : { name: "done", skipped: false, returnTo: RESTORE_CHOICE },
      );
    case "profileSaved":
      return step.name === "profile"
        ? withStep(state, { name: "channel" })
        : state;
    case "channelDone":
      return step.name === "channel"
        ? withStep(state, {
            name: "done",
            skipped: false,
            returnTo: { name: "channel" },
          })
        : state;
    case "back": {
      const previous = backStep(step);
      return previous ? withStep(state, previous) : state;
    }
    case "skip":
      return step.name === "done"
        ? state
        : withStep(state, {
            name: "done",
            skipped: true,
            returnTo: toReturnStep(step),
          });
  }
}

/** The six dots of the step indicator. */
export const WIZARD_STEP_COUNT = 6;

export type StepLabel =
  | "welcome"
  | "connect"
  | "restore"
  | "profile"
  | "channels"
  | "done";

export type NextAction =
  | "getStarted"
  | "connect"
  | "searchAgain"
  | "tryAgain"
  | "continue"
  | "setUpNew"
  | "chooseFile"
  | "restoreAndContinue"
  | "saveAndContinue"
  | "addChannel"
  | "openMessages";

export type BackAction = "back" | "cancel" | "useAnotherMethod";

export type SecondaryAction = "skipForNow" | "chooseAnotherFile";

export interface StepInfo {
  /** 1-based position among the six dots. */
  readonly number: number;
  readonly label: StepLabel;
  readonly next: NextAction | undefined;
  readonly back: BackAction | undefined;
  /** The quiet action beside next, like "Skip for now" on the channel step. */
  readonly secondary: SecondaryAction | undefined;
}

export function stepInfo(step: WizardStep): StepInfo {
  const info = (
    number: number,
    label: StepLabel,
    next: NextAction | undefined,
    secondary?: SecondaryAction,
  ): StepInfo => {
    const back = backStep(step);
    return {
      number,
      label,
      next,
      back: back === undefined ? undefined : backAction(step),
      secondary,
    };
  };
  switch (step.name) {
    case "welcome":
      return info(1, "welcome", "getStarted");
    case "connect":
      return info(2, "connect", "connect");
    case "pairing":
      return info(
        2,
        "connect",
        step.picker === "closed" ? "searchAgain" : undefined,
      );
    case "pairingError":
      return info(2, "connect", "tryAgain");
    case "sync":
      return info(2, "connect", "continue");
    case "restore":
      if (step.view === "review") {
        return info(3, "restore", "restoreAndContinue", "chooseAnotherFile");
      }
      return info(
        3,
        "restore",
        step.choice === "restore" ? "chooseFile" : "setUpNew",
      );
    case "profile":
      return info(4, "profile", "saveAndContinue");
    case "channel":
      return info(5, "channels", "addChannel", "skipForNow");
    case "done":
      return info(6, "done", "openMessages");
  }
}

const backAction = (step: WizardStep): BackAction => {
  switch (step.name) {
    case "pairing":
      return "cancel";
    case "pairingError":
      return "useAnotherMethod";
    default:
      return "back";
  }
};
