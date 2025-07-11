/**
 * Utility functions for parsing and validating hostnames and network addresses
 */

export interface ParsedHostname {
  hostname: string;
  port?: number;
  secure: boolean;
  hasExplicitProtocol: boolean;
  isValid: boolean;
  error?: string;
}

const DEFAULT_HTTP_PORT = 80; // Standard HTTP port
const DEFAULT_HTTPS_PORT = 443; // Standard HTTPS port

/**
 * Parses and validates a hostname input, handling various formats:
 * - hostname.local
 * - 192.168.1.100
 * - hostname:8080
 * - http://hostname
 * - https://hostname:8080
 */
export function parseHostname(input: string): ParsedHostname {
  if (!input || typeof input !== "string") {
    return {
      hostname: "",
      secure: false,
      hasExplicitProtocol: false,
      isValid: false,
      error: "Invalid input: hostname is required",
    };
  }

  // Trim whitespace and remove dangerous characters
  const sanitized = input.trim().replace(/[<>&"']/g, "");

  if (!sanitized) {
    return {
      hostname: "",
      secure: false,
      hasExplicitProtocol: false,
      isValid: false,
      error: "Invalid input: hostname cannot be empty",
    };
  }

  let hostname = sanitized;
  let secure = false;
  let hasExplicitProtocol = false;
  let port: number | undefined;

  // Check for explicit protocol
  if (hostname.startsWith("https://")) {
    secure = true;
    hasExplicitProtocol = true;
    hostname = hostname.slice(8); // Remove 'https://'
  } else if (hostname.startsWith("http://")) {
    secure = false;
    hasExplicitProtocol = true;
    hostname = hostname.slice(7); // Remove 'http://'
  }

  // Remove trailing slash if present
  hostname = hostname.replace(/\/$/, "");

  // Extract port if specified
  const portMatch = hostname.match(/^(.+):(\d+)$/);
  if (portMatch) {
    hostname = portMatch[1];
    const parsedPort = parseInt(portMatch[2], 10);

    if (parsedPort < 1 || parsedPort > 65535) {
      return {
        hostname: hostname,
        secure,
        hasExplicitProtocol,
        isValid: false,
        error: "Invalid port: must be between 1 and 65535",
      };
    }

    port = parsedPort;
  }

  // Validate hostname format
  if (!isValidHostname(hostname)) {
    return {
      hostname: hostname,
      port,
      secure,
      hasExplicitProtocol,
      isValid: false,
      error: "Invalid hostname format",
    };
  }

  return {
    hostname: hostname,
    port,
    secure,
    hasExplicitProtocol,
    isValid: true,
  };
}

/**
 * Validates hostname format (domain names and IP addresses)
 */
function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length === 0) {
    return false;
  }

  // Check for invalid characters
  if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) {
    return false;
  }

  // Check if it's an IPv4 address
  if (isValidIPv4(hostname)) {
    return true;
  }

  // Check if it's a valid domain name
  if (isValidDomain(hostname)) {
    return true;
  }

  return false;
}

/**
 * Validates IPv4 address format
 */
function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (!match) {
    return false;
  }

  // Check that each octet is between 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  return true;
}

/**
 * Validates domain name format
 */
function isValidDomain(domain: string): boolean {
  // Basic domain validation
  if (domain.length > 253) {
    return false;
  }

  // Cannot start or end with hyphen or dot
  if (
    domain.startsWith("-") || domain.endsWith("-") ||
    domain.startsWith(".") || domain.endsWith(".")
  ) {
    return false;
  }

  // Split into labels and validate each
  const labels = domain.split(".");
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      return false;
    }

    // Label cannot start or end with hyphen
    if (label.startsWith("-") || label.endsWith("-")) {
      return false;
    }

    // Label must contain only alphanumeric and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return false;
    }
  }

  return true;
}

/**
 * Formats hostname with appropriate default port for connection
 */
export function formatHostnameForConnection(parsed: ParsedHostname): string {
  if (!parsed.isValid) {
    throw new Error(parsed.error || "Invalid hostname");
  }

  const port = parsed.port ||
    (parsed.secure ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT);

  // Only include port if it was explicitly provided or if it's not the default
  const shouldIncludePort = parsed.port !== undefined;

  return shouldIncludePort ? `${parsed.hostname}:${port}` : parsed.hostname;
}

/**
 * Formats hostname for TransportHTTP.create() - always includes port
 */
export function formatHostnameForTransport(parsed: ParsedHostname): string {
  if (!parsed.isValid) {
    throw new Error(parsed.error || "Invalid hostname");
  }

  const port = parsed.port ||
    (parsed.secure ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT);

  return `${parsed.hostname}:${port}`;
}

/**
 * Gets the appropriate protocol string based on parsed hostname
 */
export function getProtocol(parsed: ParsedHostname): "http" | "https" {
  return parsed.secure ? "https" : "http";
}
