import { Breadcrumb } from "@components/UI/Breadcrumb.tsx";
import { cn } from "@core/utils/cn.ts";
import type { ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";

export interface SettingsPageHeaderProps {
  /** Group, then device name for radio sections. */
  crumbs: readonly ReactNode[];
  title: string;
  /** The title is already in the screen header (mobile): screen readers only. */
  hideTitle?: boolean;
  /** Where focus goes after Save or Reset removes the control that had it. */
  titleRef?: Ref<HTMLHeadingElement>;
  description: string;
  docsUrl?: string;
  /** Above the breadcrumb, e.g. a back link from a subsection. */
  leading?: ReactNode;
}

/** Breadcrumb, title, one-line description and docs link of a section. */
export const SettingsPageHeader = ({
  crumbs,
  title,
  hideTitle = false,
  titleRef,
  description,
  docsUrl,
  leading,
}: SettingsPageHeaderProps) => {
  const { t } = useTranslation("config");
  return (
    <header className="flex flex-col gap-1.5">
      {leading}
      <Breadcrumb items={crumbs} />
      <h2
        ref={titleRef}
        tabIndex={-1}
        className={cn(
          "m-0 text-display font-bold focus:outline-none",
          hideTitle && "sr-only",
        )}
      >
        {title}
      </h2>
      <p className="m-0 leading-relaxed text-secondary">
        {description}{" "}
        {docsUrl ? (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t("settingsLayout.learnMore")}
            <span className="sr-only">
              {" "}
              ({t("settingsLayout.learnMoreAbout", { section: title })})
            </span>
          </a>
        ) : null}
      </p>
    </header>
  );
};
