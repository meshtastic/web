import z from "zod";

export const urlOrIpv4Schema = z
  .string()
  .trim()
  .refine((input) => {
    // Split input into host and port (port is optional)
    const firstSlashIndex = input.indexOf("/");
    const host_port = (firstSlashIndex === -1) ? input : input.substring(0, firstSlashIndex);
    const lastColonIndex = host_port.lastIndexOf(":");
    let host = host_port;
    let port = null;

    if (lastColonIndex !== -1) {
      const potentialPort = host_port.substring(lastColonIndex + 1);
      if (/^\d+$/.test(potentialPort)) {
        host = host_port.substring(0, lastColonIndex);
        port = parseInt(potentialPort, 10);
      }
    }

    // Validate port if present
    if (port !== null) {
      // Must be 2-5 digits and between 10-65535
      if (port < 10 || port > 65535) {
        return false;
      }
    }

    // IPv4 pattern
    const ipv4Regex =
      /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    // Domain pattern (e.g. example.com, meshtastic.local)
    const domainRegex = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;
    // Local domain (e.g. meshtastic.local)
    const localDomainRegex = /^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.local$/;

    return (
      ipv4Regex.test(host) ||
      domainRegex.test(host) ||
      localDomainRegex.test(host)
    );
  }, "Must be a valid IPv4 address or domain name with optional port (10-65535)");
