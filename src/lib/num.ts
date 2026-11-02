const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// Accepts Arabic-Indic digits and decimal separators from Arabic keyboards.
export function normalizeNumber(raw: string) {
  return raw.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[٫,،]/g, '.').replace(/[^0-9.]/g, '');
}
