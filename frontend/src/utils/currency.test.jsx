import { describe, expect, it } from "vitest";
import { amountToMinorUnits, currencyFractionDigits } from "./currency.js";

describe("currency minor units", () => {
  it("uses the currency's actual fractional digits", () => {
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(currencyFractionDigits("USD")).toBe(2);
    expect(currencyFractionDigits("KWD")).toBe(3);
    expect(amountToMinorUnits("125", "JPY")).toBe(125);
    expect(amountToMinorUnits("12.34", "USD")).toBe(1234);
    expect(amountToMinorUnits("1.234", "KWD")).toBe(1234);
  });

  it("rejects amounts with excess precision and unsafe or non-positive values", () => {
    expect(amountToMinorUnits("1.001", "USD")).toBeNull();
    expect(amountToMinorUnits("0", "USD")).toBeNull();
    expect(amountToMinorUnits("9007199254740992", "USD")).toBeNull();
  });
});
