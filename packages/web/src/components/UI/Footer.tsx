import { cn } from "@core/utils/cn.ts";
import { Trans, useTranslation } from "react-i18next";

type FooterProps = {
  className?: string;
};

const Footer = ({ className, ...props }: FooterProps) => {
  const { t } = useTranslation();

  return (
    <footer
      className={cn(
        "flex mt-auto justify-center py-2 px-4 text-sm lg:text-md",
        className,
      )}
      {...props}
    >
      <div className="justify-start px-2">
        <span className="font-semibold text-gray-500/40 dark:text-gray-400/40">
          {t("footer.commitSha", {
            sha: String(import.meta.env.VITE_COMMIT_HASH)?.toUpperCase(),
          })}
        </span>
      </div>
      <p className="ml-auto mr-auto text-gray-500 dark:text-gray-400">
        <Trans
          i18nKey="footer.text"
          components={[
            <a
              key="vercel"
              rel="noopener noreferrer"
              href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss"
              className="hover:underline text-link"
            />,
            <a
              key="legal"
              rel="noopener noreferrer"
              href="https://meshtastic.org/docs/legal"
              className="hover:underline text-link"
            />,
          ]}
        />
      </p>
    </footer>
  );
};

export default Footer;
