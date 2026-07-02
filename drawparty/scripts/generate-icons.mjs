import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const sizes = [180, 192, 512];
for (const size of sizes) {
  await sharp("public/drawparty.png")
    .resize(size, size)
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`Generated icon-${size}x${size}.png`);
}
