import assert from "node:assert/strict";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import { authenticatorUri, renderAuthenticatorQr } from "@/lib/security/authenticator-provisioning";

async function main() {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  for (const account of ["admin@khyatigems.com", "admin+erp@example.test", `${"a".repeat(64)}@${"b".repeat(60)}.example.test`]) {
    const uri = authenticatorUri(account, secret), parsed = new URL(uri);
    assert.equal(parsed.protocol, "otpauth:");
    assert.equal(parsed.hostname, "totp");
    assert.equal(decodeURIComponent(parsed.pathname.slice(1)), `KhyatiGems ERP:${account}`);
    assert.equal(parsed.searchParams.get("issuer"), "KhyatiGems ERP");
    assert.equal(parsed.searchParams.get("secret"), secret);
    assert.equal(parsed.searchParams.get("algorithm"), "SHA1");
    assert.equal(parsed.searchParams.get("digits"), "6");
    assert.equal(parsed.searchParams.get("period"), "30");
    const image = await renderAuthenticatorQr(uri);
    const { data, info } = await sharp(Buffer.from(image.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const size = QRCode.create(uri, { errorCorrectionLevel: "M" }).modules.size;
    assert.equal(info.width, (size + 8) * 8, "four modules on each side, scaled by integer pixels");
    assert.equal(info.height, info.width);
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (x < 32 || y < 32 || x >= info.width - 32 || y >= info.height - 32) {
        assert.deepEqual([...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)], [255, 255, 255, 255], "quiet zone is opaque white");
      }
    }
    assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, uri, "independent scanner recovers the exact enrollment URI");
  }
  console.log("Authenticator QR checks passed: independent decoding, account/secret/issuer round-trip, square modules and four-module white quiet zone.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
