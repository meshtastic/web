import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildSearchIndex, getSectionLabel } from "./buildSearchIndex.ts";
import type {
  GroupedSearchResults,
  SearchResult,
  SearchableField,
  SettingsSection,
} from "./types.ts";

/**
 * Search fields by query, returning scored results.
 */
function searchFields(index: SearchableField[], query: string): SearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const field of index) {
    const labelLower = field.label.toLowerCase();
    const descLower = field.description.toLowerCase();

    const labelMatch = labelLower.includes(normalizedQuery);
    const descMatch = descLower.includes(normalizedQuery);

    if (labelMatch || descMatch) {
      let score = 0;

      if (labelMatch) {
        score += 10;
        if (labelLower.startsWith(normalizedQuery)) {
          score += 5;
        }
        if (labelLower === normalizedQuery) {
          score += 10;
        }
      }

      if (descMatch) {
        score += 3;
      }

      results.push({
        ...field,
        matchType:
          labelMatch && descMatch
            ? "both"
            : labelMatch
              ? "label"
              : "description",
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 20);
}

/**
 * Group search results by section for display.
 */
function groupResults(results: SearchResult[]): GroupedSearchResults[] {
  const groups = new Map<SettingsSection, SearchResult[]>();

  for (const result of results) {
    const existing = groups.get(result.section);
    if (existing) {
      existing.push(result);
    } else {
      groups.set(result.section, [result]);
    }
  }

  const groupedResults: GroupedSearchResults[] = [];

  const sectionOrder: SettingsSection[] = [
    "device",
    "radio",
    "module",
    "app",
    "advanced",
  ];

  for (const section of sectionOrder) {
    const fields = groups.get(section);
    if (fields && fields.length > 0) {
      groupedResults.push({
        section,
        sectionLabel: getSectionLabel(section),
        fields,
      });
    }
  }

  return groupedResults;
}

/**
 * Hook for searching settings fields.
 *
 * Returns search results grouped by section, along with helper state.
 */
export function useSettingsSearch(query: string) {
  const { t } = useTranslation(["config", "moduleConfig", "channels", "ui"]);

  const searchIndex = useMemo(() => {
    return buildSearchIndex(t);
  }, [t]);

  const results = useMemo(() => {
    return searchFields(searchIndex, query);
  }, [searchIndex, query]);

  const groupedResults = useMemo(() => {
    return groupResults(results);
  }, [results]);

  return {
    /** Flat list of search results */
    results,
    /** Results grouped by section */
    groupedResults,
    /** Whether we're currently searching (query is non-empty) */
    isSearching: query.trim().length > 0,
    /** Whether there are any results */
    hasResults: results.length > 0,
    /** Total number of results */
    resultCount: results.length,
  };
}
