import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";
import { socialIcon } from "../lib/email/signature";

async function main() {
  const outputDir = path.resolve("public/email/social-icons");
  fs.mkdirSync(outputDir, { recursive: true });
  for (const name of ["instagram", "facebook", "linkedin", "x", "pinterest", "reviews", "whatsapp"]) {
    const svg = socialIcon(name).replace(/currentColor/g, "#ffffff");
    const image = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
    const canvas = createCanvas(96, 96);
    canvas.getContext("2d").drawImage(image, 12, 12, 72, 72);
    fs.writeFileSync(path.join(outputDir, `${name}.png`), canvas.toBuffer("image/png"));
  }
}

main().catch((error) => {
  console.error("Failed to generate email social icons:", error);
  process.exitCode = 1;
});
