import z from "zod";

export const urlOrIpv4Schema = z
  .string()
  .trim()
  .refine((val) => {
    const input = val.replace(/^https?:\/\//i, ""); // remove protocol for validation

    // IPv4 pattern
    const ipv4Regex =
      /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

    // Domain pattern (e.g. example.com, meshtastic.local)
    const domainRegex = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

    // Local domain (e.g. meshtastic.local)
    const localDomainRegex = /^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.local$/;

    return (
      ipv4Regex.test(input) ||
      domainRegex.test(input) ||
      localDomainRegex.test(input)
    );
  }, "Must be a valid IPv4 address or domain name")
  .transform((val) => {
    return /^https?:\/\//i.test(val) ? val : `http://${val}`;
  });
