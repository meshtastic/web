interface PluralForms {
  one: string;
  other: string;
  [key: string]: string;
}

interface FormatOptions {
  locale?: string;
  pluralRules?: Intl.PluralRulesOptions;
  numberFormat?: Intl.NumberFormatOptions;
}

export function formatQuantity(
  value: number,
  forms: PluralForms,
  options: FormatOptions = {},
) {
  const {
    locale = "en-US",
    pluralRules: pluralOptions = { type: "cardinal" },
    numberFormat: numberOptions = {},
  } = options;

  const pluralRules = new Intl.PluralRules(locale, pluralOptions);
  const numberFormat = new Intl.NumberFormat(locale, numberOptions);

  const pluralCategory = pluralRules.select(value);
  const word = forms[pluralCategory];

  return `${numberFormat.format(value)} ${word}`;
}
