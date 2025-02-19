import { cn } from "@app/core/utils/cn";
import React from "react";

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <footer className={cn("flex mt-auto justify-center p-2", className)}>
        <p>
          <a
            href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss"
            className="hover:underline text-link"
          >
            Powered by ▲ Vercel
          </a>{" "}
          | Meshtastic® is a registered trademark of Meshtastic LLC. |{" "}
          <a
            href="https://meshtastic.org/docs/legal"
            className="hover:underline text-link"
          >
            Legal Information
          </a>
        </p>
      </footer>
    );
  },
);

export default Footer;
