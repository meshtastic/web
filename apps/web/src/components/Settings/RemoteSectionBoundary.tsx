import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { RemoteLoadError } from "@core/hooks/useWaitForConfig.ts";
import { useSignal } from "@core/kmp/hooks/useSignal.ts";
import type { RemoteSettingsScope } from "@core/settings/remoteContext.ts";
import { Component, type ReactNode, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Shown while a remote section is on its way. */
export const RemoteSectionLoading = ({ name }: { name: string }) => {
  const { t } = useTranslation("config");
  return (
    <output className="flex flex-col items-center gap-2 py-8 text-center text-help text-secondary">
      <Spinner size="lg" />
      <p className="m-0 font-medium text-primary">
        {t("remoteSettings.loading", { name })}
      </p>
      <p className="m-0">{t("remoteSettings.loadingHelp")}</p>
    </output>
  );
};

const FAILURE_TEXT = {
  unreachable: [
    "remoteSettings.unreachableTitle",
    "remoteSettings.unreachableDescription",
  ],
  unauthorized: [
    "remoteSettings.unauthorizedTitle",
    "remoteSettings.unauthorizedDescription",
  ],
  error: ["remoteSettings.errorTitle", "remoteSettings.errorDescription"],
} as const;

/**
 * Why a section couldn't be read, with a retry. A late answer (or a
 * retry's) clears it.
 */
const RemoteSectionFailed = ({
  error,
  scope,
  onRecovered,
}: {
  error: RemoteLoadError;
  scope: RemoteSettingsScope;
  onRecovered: () => void;
}) => {
  const { t } = useTranslation("config");
  const loads = useSignal(scope.remote.loads);
  const status = loads.get(error.key)?.status;
  useEffect(() => {
    if (status === "loaded" || status === "loading") onRecovered();
  }, [status, onRecovered]);
  const [title, description] = FAILURE_TEXT[error.reason];
  return (
    <Callout
      tone={error.reason === "unauthorized" ? "danger" : "warning"}
      title={t(title, { name: scope.name })}
    >
      <p className="m-0">{t(description, { name: scope.name })}</p>
      {error.reason === "unauthorized" ? null : (
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => void scope.remote.retry(error.key)}
        >
          {t("remoteSettings.retry")}
        </Button>
      )}
    </Callout>
  );
};

interface BoundaryProps {
  scope: RemoteSettingsScope;
  children: ReactNode;
}

interface BoundaryState {
  error: unknown;
}

/**
 * A remote section's body: a loading state while the node answers, and
 * its failure (unreachable, refused) in place of the form. Other errors
 * go on to the app's error page.
 */
export class RemoteSectionBoundary extends Component<
  BoundaryProps,
  BoundaryState
> {
  override state: BoundaryState = { error: undefined };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  private readonly recover = () => this.setState({ error: undefined });

  override render() {
    const { scope, children } = this.props;
    const { error } = this.state;
    if (error !== undefined) {
      // Not ours: on to the next boundary.
      if (!(error instanceof RemoteLoadError)) throw error;
      return (
        <RemoteSectionFailed
          error={error}
          scope={scope}
          onRecovered={this.recover}
        />
      );
    }
    return (
      <Suspense fallback={<RemoteSectionLoading name={scope.name} />}>
        {children}
      </Suspense>
    );
  }
}
