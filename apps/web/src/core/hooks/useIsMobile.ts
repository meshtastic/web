import { useEffect, useState } from "react";

const MOBILE_QUERY = "not all and (min-width: 48rem)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => globalThis.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const query = globalThis.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(query.matches);

    query.addEventListener("change", onChange);
    setIsMobile(query.matches);

    return () => query.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
