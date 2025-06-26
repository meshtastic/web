export function intlSort<T extends PropertyKey>(
  arr: T[],
  order: "asc" | "desc" = "asc",
  locale: Intl.Locale,
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });

  return arr.sort((a, b) => {
    const stringA = String(a);
    const stringB = String(b);

    if (order === "asc") {
      return collator.compare(stringA, stringB);
    } else {
      return collator.compare(stringB, stringA);
    }
  });
}
