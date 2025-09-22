import { cn } from "@core/utils/cn.ts";
import * as React from "react";
import { Trans } from "react-i18next";

type FooterProps = {
  className?: string;
  /** Show the "Ctrl+K / Cmd+K" hint */
  showHotkeyHint?: boolean;
  /** Custom label for the hotkey hint */
  hotkeyLabel?: string;
};

const Footer = ({ className, ...props }: FooterProps) => {
  const version = React.useMemo(
    () => String(import.meta.env.VITE_VERSION)?.toUpperCase() || "",
    [],
  );
  const commitHash = React.useMemo(
    () =>
      String(import.meta.env.VITE_COMMIT_HASH)
        ?.toUpperCase()
        .slice(0, 7) || "UNK",
    [],
  );

  return (
    <footer className={cn("border-t border-border p-4", className)} {...props}>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="whitespace-pre-wrap">
          <Trans
            i18nKey="footer.text"
            components={[
              <a
                title="Vercel sponsors Meshtastic Web Hosting"
                key="vercel"
                rel="noopener noreferrer"
                href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss"
                className="hover:underline text-link"
              >
                <span className="sr-only">Vercel homepage</span>
              </a>,
              <a
                key="legal"
                rel="noopener noreferrer"
                href="https://meshtastic.org/docs/legal"
                className="hover:underline text-link"
              >
                <span className="sr-only">Meshtastic terms and conditions</span>
              </a>,
            ]}
          />
        </span>
      </div>

      {(version || commitHash) && (
        <div className="mt-2 text-[11px] leading-none text-muted-foreground">
          <span className="font-semibold">{version}</span>
          <span className="mx-2">•</span>
          <span className="font-semibold">{`#${commitHash}`}</span>
        </div>
      )}
    </footer>
  );
};

export default Footer;
