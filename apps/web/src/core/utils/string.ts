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

export interface LengthValidationResult {
  isValid: boolean;
  currentLength: number | null;
}

export function validateMaxByteLength(
  value: string | null | undefined,
  maxByteLength: number,
): LengthValidationResult {
  // Ensure maxByteLength is valid
  if (
    typeof maxByteLength !== "number" ||
    !Number.isInteger(maxByteLength) ||
    maxByteLength < 0
  ) {
    console.warn(
      "validateMaxByteLength: maxByteLength must be a non-negative integer.",
    );
    return { isValid: false, currentLength: null }; // Cannot validate with invalid limit
  }

  // Handle null or undefined input values
  if (value === null || value === undefined) {
    return { isValid: false, currentLength: null };
  }

  // Check for TextEncoder availability
  if (typeof TextEncoder === "undefined") {
    console.error(
      "validateMaxByteLength: TextEncoder API is not available in this environment.",
    );
    return { isValid: false, currentLength: null }; // Cannot determine byte length
  }

  try {
    // Encode the string to UTF-8 bytes and get the length
    const encoder = new TextEncoder();
    const currentLength = encoder.encode(value).length;
    // Perform the byte length check
    const isValid = currentLength <= maxByteLength;

    // Return the result object
    return { isValid, currentLength };
  } catch (error) {
    // Handle potential errors during encoding
    console.error("validateMaxByteLength: Error encoding string:", error);
    return { isValid: false, currentLength: null }; // Encoding failed
  }
}
