import { Result } from "better-result";
import {
  type EmojiCatalog,
  EmojiDataError,
  parseEmojiData,
} from "./catalog.ts";

/**
 * Fetches the emoji catalog on first use and keeps it. A failed load is
 * not kept, so asking again retries. The data file,
 * `public/emoji/emoji-data.json`, is copied unchanged from the Meshtastic
 * Android app (github.com/meshtastic/Meshtastic-Android, commit
 * b2c52cba8c, core/ui/src/commonMain/composeResources/files/
 * emoji-data.json). Both projects are GPL-3.0.
 */

export type FetchLike = (url: string) => Promise<Response>;

export interface EmojiCatalogLoader {
  load(): Promise<Result<EmojiCatalog, EmojiDataError>>;
  /** The catalog if it has loaded, without starting a load. */
  peek(): EmojiCatalog | undefined;
  /** Forget the cached catalog (tests). */
  reset(): void;
}

export const EMOJI_DATA_PATH = "emoji/emoji-data.json";

const fetchCatalog = async (
  fetchFn: FetchLike,
  url: string,
): Promise<Result<EmojiCatalog, EmojiDataError>> => {
  let response: Response;
  try {
    response = await fetchFn(url);
  } catch (cause) {
    return Result.err(
      new EmojiDataError("Couldn't fetch the emoji data", { cause }),
    );
  }
  if (!response.ok) {
    return Result.err(
      new EmojiDataError(`Emoji data request failed (${response.status})`),
    );
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    return Result.err(
      new EmojiDataError("The emoji data isn't JSON", { cause }),
    );
  }
  return parseEmojiData(json);
};

export const createEmojiCatalogLoader = (
  fetchFn: FetchLike,
  url: string,
): EmojiCatalogLoader => {
  let pending: Promise<Result<EmojiCatalog, EmojiDataError>> | undefined;
  let loaded: EmojiCatalog | undefined;
  return {
    load() {
      if (!pending) {
        const attempt = fetchCatalog(fetchFn, url).then((result) => {
          if (Result.isOk(result)) {
            loaded = result.value;
          } else if (pending === attempt) {
            pending = undefined;
          }
          return result;
        });
        pending = attempt;
      }
      return pending;
    },
    peek: () => loaded,
    reset() {
      pending = undefined;
      loaded = undefined;
    },
  };
};

/** The app's loader: the global fetch, looked up at call time. */
export const emojiCatalogLoader = createEmojiCatalogLoader(
  (url) => globalThis.fetch(url),
  `${import.meta.env.BASE_URL}${EMOJI_DATA_PATH}`,
);
