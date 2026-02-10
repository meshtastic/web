import { DEFAULT_PREFERENCES, type DateFormat } from "@state/ui";
import { usePreference } from "./usePreferences";

export function useDateFormat(): DateFormat {
  const [dateFormat] = usePreference<DateFormat>(
    "dateFormat",
    DEFAULT_PREFERENCES.dateFormat,
  );
  return dateFormat;
}
