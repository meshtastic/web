import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { cn } from "@core/utils/cn.ts";
import { ShieldKeyholeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface RemoteSettingsBannerProps {
  name: string;
  onExit: () => void;
  className?: string;
}

/**
 * Stays at the top of Settings while another node is being managed, so
 * no change goes to the wrong radio by mistake.
 */
export const RemoteSettingsBanner = ({
  name,
  onExit,
  className,
}: RemoteSettingsBannerProps) => {
  const { t } = useTranslation("config");
  return (
    <section
      aria-label={t("remoteSettings.banner", { name })}
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        className,
      )}
    >
      <Callout
        tone="warning"
        className="min-w-0 flex-1"
        icon={<ShieldKeyholeIcon className="size-4" />}
        title={t("remoteSettings.banner", { name })}
      >
        {t("remoteSettings.bannerHelp", { name })}
      </Callout>
      <Button
        variant="secondary"
        size="sm"
        className="self-start sm:self-center"
        aria-label={t("remoteSettings.exitLabel", { name })}
        onClick={onExit}
      >
        {t("remoteSettings.exit")}
      </Button>
    </section>
  );
};
