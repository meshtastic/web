import type { EmojiCatalog } from "@core/emoji/catalog.ts";
import { quickEmojis } from "@core/emoji/frequency.ts";
import {
  type EmojiCatalogLoader,
  emojiCatalogLoader,
} from "@core/emoji/loadCatalog.ts";
import { useAppStore } from "@core/stores/appStore/index.ts";
import { Result } from "better-result";
import { useCallback, useEffect, useMemo, useState } from "react";

export type EmojiCatalogState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly catalog: EmojiCatalog }
  | { readonly status: "error" };

/**
 * The emoji catalog, fetched the first time `active` is true (the picker
 * opens) and shared from then on. `retry` tries again after a failure.
 */
export const useEmojiCatalog = (
  active: boolean,
  loader: EmojiCatalogLoader = emojiCatalogLoader,
): { state: EmojiCatalogState; retry: () => void } => {
  const [state, setState] = useState<EmojiCatalogState>(() => {
    const catalog = loader.peek();
    return catalog ? { status: "ready", catalog } : { status: "loading" };
  });
  const [attempt, setAttempt] = useState(0);
  const needed = active && state.status === "loading";

  useEffect(() => {
    if (!needed) {
      return;
    }
    let live = true;
    void loader.load().then((result) => {
      if (live) {
        setState(
          Result.isOk(result)
            ? { status: "ready", catalog: result.value }
            : { status: "error" },
        );
      }
    });
    return () => {
      live = false;
    };
  }, [needed, attempt, loader]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
};

/** The emoji picker's memory for this browser: quick row and skin tone. */
export interface EmojiPrefs {
  /** The six quick emoji, most used first. */
  readonly quick: readonly string[];
  readonly skinTone: number;
  readonly setSkinTone: (index: number) => void;
  /** Count a pick from the picker. */
  readonly recordUse: (emoji: string) => void;
}

export const useEmojiPrefs = (): EmojiPrefs => {
  const frequency = useAppStore((s) => s.emojiFrequency);
  const skinTone = useAppStore((s) => s.skinToneIndex);
  const setSkinTone = useAppStore((s) => s.setSkinToneIndex);
  const recordUse = useAppStore((s) => s.recordEmojiUse);
  const quick = useMemo(() => quickEmojis(frequency), [frequency]);
  return useMemo(
    () => ({ quick, skinTone, setSkinTone, recordUse }),
    [quick, skinTone, setSkinTone, recordUse],
  );
};
