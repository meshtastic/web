import React from "react";

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <footer
        className={`flex flex- justify-center p-2 ${className}`}
        style={{
          backgroundColor: "var(--backgroundPrimary)",
          color: "var(--textPrimary)",
        }}
      >
        <p>
          <a
            href="https://vercel.com/?utm_source=meshtastic&utm_campaign=oss"
            className="hover:underline"
            style={{ color: "var(--link)" }}
          >
            Powered by ▲ Vercel
          </a>{" "}
          | Meshtastic® is a registered trademark of Meshtastic LLC. |{" "}
          <a
            href="https://meshtastic.org/docs/legal"
            className="hover:underline"
            style={{ color: "var(--link)" }}
          >
            Legal Information
          </a>
        </p>
      </footer>
    );
  },
);

export default Footer;
