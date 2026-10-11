export function currencyFractionDigits(currency) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

export function amountToMinorUnits(value, currency) {
  const digits = currencyFractionDigits(currency);
  const parts = String(value).trim().split(".");
  if (parts.length > 2 || !/^\d+$/.test(parts[0])) return null;

  const fraction = parts[1] ?? "";
  if (fraction.length > digits || (parts.length === 2 && digits === 0)) return null;

  const factor = 10n ** BigInt(digits);
  const amount = BigInt(parts[0]) * factor
    + BigInt((fraction + "0".repeat(digits)).slice(0, digits) || "0");
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(amount);
}

export function formatMinorUnits(amountMinor, currency) {
  const digits = currencyFractionDigits(currency);
  const amount = amountMinor / 10 ** digits;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
}
