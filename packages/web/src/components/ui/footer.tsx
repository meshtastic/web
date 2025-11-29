import { cn } from "@core/utils/cn.ts";
import React from "react";
import { Trans } from "react-i18next";

type FooterProps = {
  className?: string;
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
        .slice(0, 7) || "unk",
    [],
  );

  return (
    <footer
      className={cn(
        "flex mt-auto justify-center py-2 px-4 text-sm lg:text-md",
        className,
      )}
      {...props}
    >
      <div className="px-2">
        <span className="font-semibold text-gray-500/40 dark:text-gray-400/40">
          {version}
        </span>
        <span className="font-semibold text-gray-500/40 dark:text-gray-400/40 mx-2">
          -
        </span>
        <span className="font-semibold text-gray-500/40 dark:text-gray-400/40">
          {`#${commitHash}`}
        </span>
      </div>
      <p className="ml-auto mr-auto text-gray-500 dark:text-gray-400">
        <Trans
          i18nKey="footer.text"
          components={[
            // biome-ignore lint/a11y/useAnchorContent: because I want to use the link component
            <a
              key="vercel"
              rel="noopener noreferrer"
              href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss"
              className="hover:underline text-link"
            />,
            // biome-ignore lint/a11y/useAnchorContent: because I want to use the link component
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
