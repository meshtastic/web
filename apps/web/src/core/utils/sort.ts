export function intlSort<T extends PropertyKey>(
  arr: T[],
  locale: Intl.Locale,
  order: "asc" | "desc" = "asc",
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });

  return arr.sort((a, b) => {
    const stringA = String(a);
    const stringB = String(b);

    if (order === "asc") {
      return collator.compare(stringA, stringB);
    }
    return collator.compare(stringB, stringA);
  });
}
