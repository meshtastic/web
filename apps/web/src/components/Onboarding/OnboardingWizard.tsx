import { Callout } from "@components/UI/Callout.tsx";
import { StepDots } from "@components/UI/StepDots.tsx";
import { useLocalNetworkAccess } from "@core/hooks/useLocalNetworkAccess.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useConnectionProgress } from "@core/kmp/hooks";
import {
  detectBrowserEnvironment,
  detectBrowserFeatures,
  isHttpsRequired,
  transportSupport,
} from "@core/onboarding/capabilities.ts";
import { syncView } from "@core/onboarding/syncProgress.ts";
import {
  type HttpAddressError,
  httpTarget,
} from "@core/onboarding/validation.ts";
import { type RestoreNotice, restoreNotice } from "@core/onboarding/restore.ts";
import { markWelcomeDismissed } from "@core/onboarding/welcome.ts";
import {
  type BackAction,
  effectiveUseHttps,
  initWizard,
  type NextAction,
  type SecondaryAction,
  stepInfo,
  WIZARD_STEP_COUNT,
  type WizardEvent,
  type WizardState,
  type WizardStepName,
  wizardReducer,
} from "@core/onboarding/wizard.ts";
import { CONNECT_TIMEOUT_MS } from "@core/onboarding/picker.ts";
import { useDeviceStore } from "@core/stores";
import type { ConnectionStatus } from "@core/stores/deviceStore/types.ts";
import { Result } from "better-result";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { MeshIllustration, type MeshScene } from "./MeshIllustration.tsx";
import { type StepActionsProps, StepCounterContext } from "./StepLayout.tsx";
import { ChannelStep } from "./steps/ChannelStep.tsx";
import { ConnectStep } from "./steps/ConnectStep.tsx";
import { DoneStep } from "./steps/DoneStep.tsx";
import { PairingErrorStep } from "./steps/PairingErrorStep.tsx";
import { PairingStep } from "./steps/PairingStep.tsx";
import { ProfileStep } from "./steps/ProfileStep.tsx";
import { RestoreStep } from "./steps/RestoreStep.tsx";
import { SyncStep } from "./steps/SyncStep.tsx";
import { WelcomeStep } from "./steps/WelcomeStep.tsx";
import { useWizardConnection } from "./useWizardConnection.ts";

const IN_PROGRESS: ReadonlyArray<ConnectionStatus> = [
  "connecting",
  "connected",
  "configuring",
];

const STEP_FORM_ID = "onboarding-step-form";

/** Statuses of a connection that had reached the transport. */
const LIVE: ReadonlyArray<ConnectionStatus> = [
  "connected",
  "configuring",
  "configured",
];

/** A note carried to the next step after a save or a restore. */
interface RestartNotice {
  readonly step: WizardStepName;
  readonly message:
    | "profile.savedRestarting"
    | "channel.savedRestarting"
    | RestoreNotice;
}

const NEXT_LABEL: Record<NextAction, string> = {
  getStarted: "actions.getStarted",
  connect: "actions.connect",
  searchAgain: "actions.searchAgain",
  tryAgain: "actions.tryAgain",
  continue: "actions.continue",
  setUpNew: "actions.continue",
  chooseFile: "actions.chooseFile",
  restoreAndContinue: "actions.restoreAndContinue",
  saveAndContinue: "actions.saveAndContinue",
  addChannel: "actions.addChannel",
  openWebClient: "actions.openWebClient",
};

const SECONDARY_LABEL: Record<SecondaryAction, string> = {
  skipForNow: "actions.skipForNow",
  chooseAnotherFile: "actions.chooseAnotherFile",
};

const BACK_LABEL: Record<BackAction, string> = {
  back: "actions.back",
  cancel: "actions.cancel",
  useAnotherMethod: "actions.useAnotherMethod",
};

/** The illustration and caption for a step. */
function sceneOf(state: WizardState): { scene: MeshScene; caption: string } {
  const { step } = state;
  switch (step.name) {
    case "welcome":
      return { scene: "welcome", caption: "caption.welcome" };
    case "connect":
      return {
        scene: "idle",
        caption: state.support.httpOnly
          ? "caption.connectUnsupported"
          : state.method === "http"
            ? "caption.connectHttp"
            : "caption.connect",
      };
    case "pairing":
      return {
        scene: "searching",
        caption:
          state.method === "serial"
            ? "caption.pairingSerial"
            : "caption.pairing",
      };
    case "pairingError":
      return { scene: "failed", caption: "caption.pairingError" };
    case "sync":
      return { scene: "connected", caption: "caption.sync" };
    case "restore":
      return { scene: "connected", caption: "caption.restore" };
    case "profile":
      return { scene: "connected", caption: "caption.profile" };
    case "channel":
      return { scene: "channel", caption: "caption.channel" };
    case "done":
      return { scene: "done", caption: "caption.done" };
  }
}

export interface OnboardingWizardProps {
  /** Leaves the wizard for the messages screen. */
  onFinish: () => void;
}

/**
 * First-run setup: welcome, connect a radio, pair, sync, set a name and
 * region, join a channel. Connecting goes through `useConnections`; saving
 * goes through the config editor, like Settings.
 */
export const OnboardingWizard = ({ onFinish }: OnboardingWizardProps) => {
  const { t } = useTranslation("onboarding");
  const support = useMemo(
    () => transportSupport(detectBrowserFeatures(), detectBrowserEnvironment()),
    [],
  );
  const pageIsHttps = globalThis.location?.protocol === "https:";
  const httpsLocked = isHttpsRequired(pageIsHttps, useLocalNetworkAccess());

  const [state, dispatch] = useReducer(wizardReducer, undefined, () => {
    const { activeConnectionId, savedConnections } = useDeviceStore.getState();
    const active = savedConnections.find((c) => c.id === activeConnectionId);
    return initWizard({
      support,
      connecting: active !== undefined && IN_PROGRESS.includes(active.status),
    });
  });
  const { step } = state;
  const useHttps = effectiveUseHttps(state, {
    pageIsHttps,
    httpsRequired: httpsLocked,
  });

  const { connection, attempt, cancel, discard } =
    useWizardConnection(dispatch);
  const progress = useConnectionProgress();
  const view = syncView(connection?.status, progress);
  const myNode = useMyNodeAsProto();
  const radioName =
    myNode?.user?.shortName || myNode?.user?.longName || connection?.name;
  const radioReady = connection?.status === "configured";
  const hasRadio =
    connection !== undefined &&
    (connection.status === "configured" || connection.status === "connected");
  // Reached a radio this session, even if it is restarting after a save.
  const radioReached =
    connection?.nodeNum !== undefined &&
    connection.status !== "error" &&
    connection.status !== "disconnected";

  const [addressError, setAddressError] = useState<HttpAddressError>();
  const counterId = useId();
  const connectionId = connection?.id;
  // Saves read the status after their commit, not the render's copy.
  const statusNow = useCallback(
    (): ConnectionStatus | undefined =>
      connectionId === undefined
        ? undefined
        : useDeviceStore
            .getState()
            .savedConnections.find((c) => c.id === connectionId)?.status,
    [connectionId],
  );

  const [notice, setNotice] = useState<RestartNotice>();

  // A connection that fails or drops while the wizard waits on it is a
  // failure. "disconnected" counts only after the connection was live: a
  // new entry starts out disconnected before it connects.
  const lastStatus = useRef(connection?.status);
  useEffect(() => {
    const previous = lastStatus.current;
    lastStatus.current = connection?.status;
    if (step.name !== "sync" || previous === connection?.status) return;
    if (connection?.status === "error") {
      dispatch({ type: "connectFailed", detail: connection.error });
    } else if (
      connection?.status === "disconnected" &&
      previous !== undefined &&
      LIVE.includes(previous)
    ) {
      dispatch({ type: "connectFailed", detail: t("error.dropped") });
    }
  }, [step.name, connection?.status, connection?.error, t]);

  // A radio that never answers ends in the error screen, not a spinner.
  const waitingForRadio = step.name === "sync" && view.phase === "connecting";
  useEffect(() => {
    if (!waitingForRadio) return;
    const timer = setTimeout(() => {
      void cancel();
      dispatch({ type: "connectFailed", detail: t("error.timeout") });
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [waitingForRadio, cancel, t]);

  // The wizard opens on its own once: seeing it counts, whether it is
  // finished, skipped or left part way.
  useEffect(() => {
    markWelcomeDismissed();
  }, []);

  /** Connect, Search again and Try again: run the transport from the click. */
  const beginAttempt = (event: WizardEvent) => {
    if (state.method === "http") {
      const target = httpTarget(state.httpAddress, useHttps);
      if (Result.isError(target)) {
        setAddressError(target.error);
        // A retry with a bad address goes back to where it can be fixed.
        if (step.name === "pairingError") dispatch({ type: "back" });
        return;
      }
      setAddressError(undefined);
      dispatch(event);
      void attempt("http", target.value);
      return;
    }
    dispatch(event);
    void attempt(state.method);
  };

  const info = stepInfo(step);
  const onNext = (): void => {
    if (info.next === undefined) return;
    switch (info.next) {
      case "getStarted":
        dispatch({ type: "start", connected: hasRadio });
        return;
      case "connect":
        beginAttempt({ type: "connectRequested" });
        return;
      case "searchAgain":
      case "tryAgain":
        beginAttempt({ type: "retry" });
        return;
      case "continue":
        dispatch({ type: "continue" });
        return;
      case "setUpNew":
        dispatch({ type: "setUpNew" });
        return;
      case "openWebClient":
        onFinish();
        return;
      case "saveAndContinue":
      case "addChannel":
      case "restoreAndContinue":
        // Submitted through the step's form.
        return;
      case "chooseFile":
        // The restore step opens its file input from the click.
        return;
    }
  };

  const actions: StepActionsProps = {
    back: waitingForRadio
      ? {
          label: t("actions.cancel"),
          onClick: () => {
            void cancel();
            dispatch({ type: "cancelConnect" });
          },
        }
      : info.back
        ? {
            label: t(BACK_LABEL[info.back]),
            onClick: () => dispatch({ type: "back" }),
          }
        : undefined,
    secondary: info.secondary
      ? {
          label: t(SECONDARY_LABEL[info.secondary]),
          onClick:
            info.secondary === "skipForNow"
              ? () => dispatch({ type: "channelDone" })
              : undefined,
        }
      : undefined,
    next: info.next
      ? {
          label: t(NEXT_LABEL[info.next]),
          onClick: onNext,
          disabled: info.next === "continue" && view.phase !== "ready",
        }
      : undefined,
  };

  const renderStep = () => {
    switch (step.name) {
      case "welcome":
        return <WelcomeStep actions={actions} />;
      case "connect":
        return (
          <ConnectStep
            actions={{
              ...actions,
              next: actions.next && {
                ...actions.next,
                form: state.method === "http" ? STEP_FORM_ID : undefined,
              },
            }}
            formId={STEP_FORM_ID}
            support={state.support}
            method={state.method}
            onSelectMethod={(method) => {
              setAddressError(undefined);
              dispatch({ type: "selectMethod", method });
            }}
            httpAddress={state.httpAddress}
            onHttpAddressChange={(value) => {
              setAddressError(undefined);
              dispatch({ type: "setHttpAddress", value });
            }}
            useHttps={useHttps}
            onUseHttpsChange={(value) =>
              dispatch({ type: "setUseHttps", value })
            }
            httpsLocked={httpsLocked}
            addressError={addressError}
            onSubmit={onNext}
          />
        );
      case "pairing":
        return (
          <PairingStep
            actions={actions}
            method={state.method === "serial" ? "serial" : "bluetooth"}
            picker={step.picker}
            onNotListed={() => dispatch({ type: "radioNotListed" })}
          />
        );
      case "pairingError":
        return (
          <PairingErrorStep
            actions={actions}
            method={state.method}
            detail={step.detail}
            certificateUrl={
              connection?.type === "http" &&
              connection.errorKind === "cert" &&
              connection.url.startsWith("https:")
                ? connection.url
                : undefined
            }
            onCertificateTrusted={() => beginAttempt({ type: "retry" })}
          />
        );
      case "sync":
        return <SyncStep actions={actions} radioName={radioName} view={view} />;
      case "restore":
        return (
          <RestoreStep
            actions={actions}
            formId={STEP_FORM_ID}
            view={step}
            onSelectChoice={(choice) =>
              dispatch({ type: "selectRestoreChoice", choice })
            }
            onFileLoaded={() => dispatch({ type: "restoreFileLoaded" })}
            radioReady={radioReady}
            statusNow={statusNow}
            onRestored={(outcome, regionUnset) => {
              setNotice({
                step: regionUnset ? "profile" : "done",
                message: restoreNotice(outcome, regionUnset),
              });
              dispatch({ type: "restored", regionUnset });
            }}
          />
        );
      case "profile":
        return (
          <ProfileStep
            actions={actions}
            formId={STEP_FORM_ID}
            radioReady={radioReady}
            statusNow={statusNow}
            onSaved={(restarting) => {
              setNotice(
                restarting
                  ? { step: "channel", message: "profile.savedRestarting" }
                  : undefined,
              );
              dispatch({ type: "profileSaved" });
            }}
          />
        );
      case "channel":
        return (
          <ChannelStep
            actions={actions}
            formId={STEP_FORM_ID}
            radioReady={radioReady}
            statusNow={statusNow}
            onDone={(restarting) => {
              setNotice(
                restarting
                  ? { step: "done", message: "channel.savedRestarting" }
                  : undefined,
              );
              dispatch({ type: "channelDone" });
            }}
          />
        );
      case "done":
        return (
          <DoneStep
            actions={actions}
            radioName={radioReached ? radioName : undefined}
          />
        );
    }
  };

  const { scene, caption } = sceneOf(state);
  const stepName = t(`steps.${info.label}`);

  return (
    // Safe-area padding keeps the frame clear of notches and the home
    // indicator once the page draws edge to edge (viewport-fit=cover).
    <div className="flex min-h-dvh flex-col bg-app pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-primary">
      <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-subtle px-4 pt-[env(safe-area-inset-top)] md:px-8">
        <span className="flex items-center gap-2.5 text-title font-bold">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-accent text-on-accent"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 18 6-10 4 7" />
              <path d="m12 18 5-9 4 9" />
            </svg>
          </span>
          {t("frame.brand")}
        </span>
        <nav className="flex items-center gap-5 text-body">
          <a
            href="https://meshtastic.org/docs"
            target="_blank"
            rel="noreferrer"
            className="relative text-accent underline-offset-4 hover:underline pointer-coarse:touch-target"
          >
            {t("frame.docs")}
          </a>
          {step.name === "done" ? null : (
            <button
              type="button"
              onClick={() => {
                void discard();
                dispatch({ type: "skip" });
              }}
              className="relative h-9 rounded-md px-1 text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-focus pointer-coarse:touch-target"
            >
              {t("frame.skip")}
            </button>
          )}
        </nav>
      </header>
      <main className="flex flex-1 items-start justify-center px-0 py-0 md:items-center md:px-6 md:py-10">
        <div className="flex w-full max-w-[1040px] flex-wrap overflow-hidden bg-surface md:rounded-[20px] md:border md:border-subtle">
          <section className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-top))] min-w-0 flex-[1_1_480px] flex-col gap-5 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:min-h-[620px] md:px-11 md:py-10">
            {/* Each step's heading takes focus and is described by this
                counter, so "Step n of m" is read with it. */}
            <div id={counterId}>
              <StepDots
                current={info.number}
                total={WIZARD_STEP_COUNT}
                stepName={stepName}
              />
            </div>
            {notice && notice.step === step.name ? (
              <Callout tone="info" className="self-stretch">
                <output>{t(notice.message)}</output>
              </Callout>
            ) : null}
            <StepCounterContext.Provider value={counterId}>
              <div key={step.name} className="flex flex-1 flex-col gap-5">
                {renderStep()}
              </div>
            </StepCounterContext.Provider>
          </section>
          <MeshIllustration
            scene={scene}
            caption={t(caption)}
            className="hidden flex-[1_1_380px] lg:block"
          />
        </div>
      </main>
    </div>
  );
};
