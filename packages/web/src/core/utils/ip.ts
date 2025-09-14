export function convertIntToIpAddress(int: number): string {
  return `${int & 0xff}.${(int >> 8) & 0xff}.${(int >> 16) & 0xff}.${
    (int >> 24) & 0xff
  }`;
}

export function convertIpAddressToInt(ip: string): number | undefined {
  if (!ip) {
    return undefined;
  }
  return (
    ip
      .split(".")
      .reverse()
      .reduce((ipnum, octet) => {
        return (ipnum << 8) + Number.parseInt(octet, 10);
      }, 0) >>> 0
  );
}
