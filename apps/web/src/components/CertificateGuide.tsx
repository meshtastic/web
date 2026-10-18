import { Button } from "@components/UI/Button.tsx";
import { cn } from "@core/utils/cn.ts";
import { CheckCircle2, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type CertBrowser = "firefox" | "safari" | "chromium";

/** Which browser's certificate warning the user will see. */
export function detectCertBrowser(userAgent: string): CertBrowser {
  if (/Firefox\//.test(userAgent)) return "firefox";
  if (/Safari\//.test(userAgent) && !/Chrome|Chromium|Edg\//.test(userAgent)) {
    return "safari";
  }
  return "chromium";
}

/** How often to re-test while waiting, and for how long. */
const POLL_MS = 4_000;
const WAIT_MS = 120_000;

type GuideState = "idle" | "waiting" | "trusted" | "timedOut";

interface CertificateGuideProps {
  /** The radio's https:// URL. */
  url: string;
  /** Re-test the connection; resolves true once the certificate is trusted. */
  retest: () => Promise<boolean>;
  /** Called once the certificate is trusted. */
  onTrusted?: () => void;
  /**
   * The failure may not be the certificate (some browsers, e.g. Firefox,
   * fail too slowly to tell); word the title as a likely cause.
   */
  uncertain?: boolean;
  className?: string;
}

/**
 * Walks the user through accepting the radio's self-signed certificate.
 *
 * Firefox and Safari remember the decision permanently (Safari adds it to
 * the keychain), so this is a one-time step per radio; no certificate needs
 * installing in the operating system. After the radio opens in a new tab,
 * the connection is re-tested whenever the user returns to this tab and
 * every few seconds, so they don't have to know to test again.
 */
export function CertificateGuide({
  url,
  retest,
  onTrusted,
  uncertain = false,
  className,
}: CertificateGuideProps) {
  const { t } = useTranslation("connections");
  const [state, setState] = useState<GuideState>("idle");
  const deadline = useRef(0);
  const checking = useRef(false);
  // Bumped on unmount and when the URL changes, so a re-test that finishes
  // afterwards can't mark a different address as trusted.
  const generation = useRef(0);
  const browser = detectCertBrowser(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
  );
  const stepList = t(`certGuide.steps.${browser}`, { returnObjects: true });
  // A locale missing the list returns the key as a string.
  const steps = Array.isArray(stepList) ? (stepList as string[]) : [];

  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    const started = generation.current;
    try {
      const trusted = await retest();
      if (started !== generation.current) return;
      if (trusted) {
        setState("trusted");
        onTrusted?.();
      } else if (Date.now() > deadline.current) {
        setState("timedOut");
      }
    } finally {
      checking.current = false;
    }
  }, [retest, onTrusted]);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [url],
  );

  useEffect(() => {
    if (state !== "waiting") return;
    const onReturn = () => {
      if (document.visibilityState === "visible") void check();
    };
    const timer = setInterval(() => void check(), POLL_MS);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [state, check]);

  const openRadio = () => {
    deadline.current = Date.now() + WAIT_MS;
    setState("waiting");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (state === "trusted") {
    return (
      <p
        className={cn(
          "flex items-center gap-1 text-sm text-green-600 dark:text-green-400",
          className,
        )}
      >
        <CheckCircle2 className="size-4" />
        {t("certGuide.trusted")}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
        <ShieldAlert className="size-4 shrink-0" />
        {uncertain ? t("certGuide.titleUncertain") : t("certGuide.title")}
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        {t("certGuide.description")}
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-200">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" className="gap-2" onClick={openRadio}>
          <ExternalLink className="size-4" />
          {state === "idle"
            ? t("certGuide.openRadio")
            : t("certGuide.openAgain")}
        </Button>
        {state === "waiting" && (
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            {t("certGuide.waiting")}
          </span>
        )}
        {state === "timedOut" && (
          <span className="text-red-600 dark:text-red-400">
            {t("certGuide.timedOut")}
          </span>
        )}
      </div>
    </div>
  );
}
