
import { z } from "zod";

const schema = z.object({
  gemstoneCodeId: z.string().optional().transform(v => {
      console.log(`Transforming input: '${v}' (${typeof v})`);
      return v === "" ? undefined : v;
  }).pipe(z.string().uuid().optional())
});

async function test() {
  console.log("Testing empty string:");
  try {
    const res = schema.parse({ gemstoneCodeId: "" });
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e);
  }

  console.log("\nTesting undefined:");
  try {
    const res = schema.parse({ gemstoneCodeId: undefined });
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e);
  }
  
  console.log("\nTesting valid UUID:");
  try {
    const res = schema.parse({ gemstoneCodeId: "123e4567-e89b-12d3-a456-426614174000" });
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e);
  }

  console.log("\nTesting invalid UUID string:");
  try {
    const res = schema.parse({ gemstoneCodeId: "not-a-uuid" });
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
