// One-off: the shipped logo PNG has huge transparent padding baked in (the
// real artwork only fills the middle ~26% of the canvas height), so scaling
// the <img> up in CSS mostly just enlarges empty space. This autocrops the
// source asset down to its actual visible content and writes a new file;
// Logo.tsx is updated separately to import the cropped version.
import { Jimp } from "jimp";

const src = new URL("../src/assets/konexigo-logo-transparent.png", import.meta.url);
const out = new URL("../src/assets/konexigo-logo-cropped.png", import.meta.url);

const image = await Jimp.read(src);
image.autocrop();
await image.write(out);

console.log(`Cropped ${image.bitmap.width}x${image.bitmap.height} -> ${out.pathname}`);
