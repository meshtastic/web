import React from "react";
import Cookies, { type CookieAttributes } from "js-cookie";

type Cookie<T> = [
  T | undefined,
  (value: T, options?: CookieAttributes) => void,
  () => void,
];

const useCookie = <T>(
  cookieName: string,
  initialValue?: T,
): Cookie<T> => {
  const [cookieValue, setCookieValue] = React.useState<T | undefined>(() => {
    const cookie = Cookies.get(cookieName);
    return cookie ? (JSON.parse(cookie) as T) : initialValue;
  });

  const setCookie = React.useCallback(
    (value: T, options?: CookieAttributes) => {
      Cookies.set(cookieName, JSON.stringify(value), options);
      setCookieValue(value);
    },
    [cookieName],
  );

  const removeCookie = React.useCallback(() => {
    Cookies.remove(cookieName);
    setCookieValue(undefined);
  }, [cookieName]);

  return [cookieValue, setCookie, removeCookie];
};

export default useCookie;
