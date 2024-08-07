export function convertIntToIpAddress(int: number): string {
  return `${int & 0xff}.${(int >> 8) & 0xff}.${(int >> 16) & 0xff}.${(int >> 24) & 0xff}`;
}

export function convertIpAddressToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number).reverse(); // little-endian byte order

  if (parts.some(Number.isNaN)) {
      return null;
  }

  return parts.reduce((total, part) => (total << 8) | part, 0);
}