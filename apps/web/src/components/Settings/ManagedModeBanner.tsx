import { Callout } from "@components/UI/Callout.tsx";
import { ShieldCheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Stays at the top of Settings while the connected radio is in managed
 * mode, explaining why its settings can't be changed from here.
 */
export const ManagedModeBanner = () => {
  const { t } = useTranslation("config");
  return (
    <section aria-label={t("managedMode.bannerTitle")}>
      <Callout
        tone="info"
        icon={<ShieldCheckIcon className="size-4" />}
        title={t("managedMode.bannerTitle")}
      >
        {t("managedMode.bannerDescription")}
      </Callout>
    </section>
  );
};
