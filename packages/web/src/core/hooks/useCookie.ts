import Cookies from "js-cookie";
import { useCallback, useState } from "react";

interface CookieHookResult<T> {
  value: T | undefined;
  setCookie: (value: T, options?: Cookies.CookieAttributes) => void;
  removeCookie: () => void;
}

function useCookie<T extends object>(
  cookieName: string,
  initialValue?: T,
): CookieHookResult<T> {
  const [cookieValue, setCookieValue] = useState<T | undefined>(() => {
    try {
      const cookie = Cookies.get(cookieName);
      return cookie ? (JSON.parse(cookie) as T) : initialValue;
    } catch (error) {
      console.error(`Error parsing cookie ${cookieName}:`, error);
      return initialValue;
    }
  });

  const setCookie = useCallback(
    (value: T, options?: Cookies.CookieAttributes) => {
      try {
        Cookies.set(cookieName, JSON.stringify(value), options);
        setCookieValue(value);
      } catch (error) {
        console.error(`Error setting cookie ${cookieName}:`, error);
      }
    },
    [cookieName],
  );

  const removeCookie = useCallback(() => {
    try {
      Cookies.remove(cookieName);
      setCookieValue(undefined);
    } catch (error) {
      console.error(`Error removing cookie ${cookieName}:`, error);
    }
  }, [cookieName]);

  return {
    value: cookieValue,
    setCookie,
    removeCookie,
  };
}

export default useCookie;
