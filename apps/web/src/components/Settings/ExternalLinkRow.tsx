import { buttonVariants } from "@components/UI/Button.tsx";
import {
  SettingRow,
  settingRowDescribedBy,
} from "@components/UI/SettingRow.tsx";
import { cn } from "@core/utils/cn.ts";
import { ExternalLinkIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface ExternalLinkRowProps {
  label: string;
  help?: string;
  actionLabel: string;
  href: string;
}

/**
 * A settings row whose action opens another site: a real link (so it can
 * be middle-clicked or copied) styled as a button, announced as opening a
 * new tab.
 */
export const ExternalLinkRow = ({
  label,
  help,
  actionLabel,
  href,
}: ExternalLinkRowProps) => {
  const { t } = useTranslation("config");
  const id = useId();
  return (
    <SettingRow kind="custom" label={label} help={help} controlId={id}>
      <a
        id={id}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={settingRowDescribedBy(id, { help: Boolean(help) })}
        className={cn(buttonVariants({ variant: "secondary" }), "text-help")}
      >
        {actionLabel}
        <span className="sr-only">
          {" "}
          {label} {t("settingsLayout.opensInNewTab")}
        </span>
        <ExternalLinkIcon aria-hidden="true" className="ml-1.5 size-3.5" />
      </a>
    </SettingRow>
  );
};
