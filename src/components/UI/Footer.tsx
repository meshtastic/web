import { cn } from "@core/utils/cn.ts";
import { Trans } from "react-i18next";

type FooterProps = {
  className?: string;
};

const Footer = ({ className, ...props }: FooterProps) => {
  return (
    <footer
      className={cn(
        "flex mt-auto justify-center py-2 px-4 text-sm lg:text-md",
        className,
      )}
      {...props}
    >
      <p>
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
