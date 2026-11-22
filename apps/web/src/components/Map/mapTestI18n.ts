import mapEN from "@public/i18n/locales/en/map.json" with { type: "json" };
import i18n from "i18next";

/** The shared test setup doesn't load the map namespace; map tests add it. */
export const loadMapTranslations = () => {
  if (!i18n.hasResourceBundle("en", "map")) {
    i18n.addResourceBundle("en", "map", mapEN);
  }
};
