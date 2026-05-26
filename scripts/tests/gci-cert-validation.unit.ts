import assert from "node:assert";
import { getMissingGciFields } from "../../lib/gci-certificate";

const baseFields = {
  species: "Ruby",
  variety: "Ruby",
  color: "Red",
  weight: 2.1,
  shape: "Round",
  origin: "Mozambique",
  treatment: "Heated",
  fluorescence: "None",
  hasImages: true,
};

const missing: string[] = getMissingGciFields({
  ...baseFields,
  measurements: undefined,
});

assert.deepStrictEqual(missing, []);
assert.ok(missing.every((item) => item !== "Measurements"));

console.log("gci-cert-validation.unit.ts passed");
