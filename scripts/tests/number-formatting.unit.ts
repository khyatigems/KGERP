import assert from "node:assert";
import { formatInrCurrency, formatInrNumber, sanitizeNumberText } from "../../lib/number-formatting";

const noUnicodeSpaces = (value: string) => !/[\s\u00A0\u1680\u180E\u2000-\u200F\u2028\u2029\u202F\u205F\u3000\uFEFF]/.test(value);

assert.equal(sanitizeNumberText("1 2 3"), "123");
assert.equal(sanitizeNumberText("1\u00A02\u202F3"), "123");

assert.equal(formatInrNumber(12233.01, 2), "12,233.01");
assert.equal(formatInrNumber(131656, 0), "1,31,656");

const v1 = formatInrCurrency(12233.01);
assert.ok(v1.startsWith("₹"));
assert.ok(noUnicodeSpaces(v1));

const v2 = formatInrCurrency("  12233.01  ");
assert.equal(v2, "₹12,233.01");

