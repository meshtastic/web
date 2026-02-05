import { usePreference } from "./usePreferences";
import { DEFAULT_PREFERENCES, type DateFormat } from "@state/ui";

export function useDateFormat(): DateFormat {
  const [dateFormat] = usePreference<DateFormat>(
    "dateFormat",
    DEFAULT_PREFERENCES.dateFormat,
  );
  return dateFormat;
}
