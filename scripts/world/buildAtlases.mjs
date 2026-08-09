// SVG masters → texture atlases for the Phaser world.
//
//   npm run world:atlases
//
// For every zone directory under assets/world/svg/<zone>/, rasterizes each
// SVG at 1x/2x/3x (sharp) and packs each scale into a texture atlas
// (free-tex-packer-core, Phaser 3 JSON format), written to
// public/world/atlases/<zone>@{1,2,3}x.{png,json}.
//
// The SVGs stay the single editable source of truth; the atlases are build
// artifacts but ARE committed, so Vercel previews and fresh checkouts render
// the world without needing sharp installed. Rerun this script after any SVG
// edit and commit the result.
//
// Frame names are the SVG basenames (island-meadow.svg → frame
// "island-meadow") — the names scene code and zone layouts refer to.

import { readdir, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { packAsync } from "free-tex-packer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const svgRoot = path.join(root, "assets", "world", "svg");
const outRoot = path.join(root, "public", "world", "atlases");

const SCALES = [1, 2, 3];

async function rasterize(svgPath, scale) {
  const svg = await readFile(svgPath);
  const meta = await sharp(svg).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`${svgPath}: SVG needs width/height (or a viewBox sharp can size)`);
  }
  return sharp(svg)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale))
    .png()
    .toBuffer();
}

async function buildZone(zone) {
  const zoneDir = path.join(svgRoot, zone);
  const svgs = (await readdir(zoneDir)).filter((f) => f.endsWith(".svg")).sort();
  if (svgs.length === 0) {
    console.log(`- ${zone}: no SVGs, skipped`);
    return;
  }

  for (const scale of SCALES) {
    const images = [];
    for (const file of svgs) {
      images.push({
        path: `${path.basename(file, ".svg")}.png`,
        contents: await rasterize(path.join(zoneDir, file), scale),
      });
    }

    const textureName = `${zone}@${scale}x`;
    const files = await packAsync(images, {
      textureName,
      width: 2048 * scale,
      height: 2048 * scale,
      fixedSize: false,
      powerOfTwo: false,
      padding: 2,
      extrude: 1,
      allowRotation: false,
      allowTrim: true,
      detectIdentical: true,
      // JsonHash (single texture, {frames: {...}}) rather than the Phaser3
      // multiatlas format: Phaser 3.90's multiatlas loader has a race where
      // the child PNG is never flushed if the JSON finishes last, stalling
      // the whole boot. load.atlas + JsonHash takes explicit URLs and has no
      // child-file step at all.
      exporter: "JsonHash",
      removeFileExtension: true,
      prependFolderName: false,
    });

    for (const file of files) {
      await writeFile(path.join(outRoot, file.name), file.buffer);
    }
    const png = files.find((f) => f.name.endsWith(".png"));
    console.log(`- ${textureName}: ${svgs.length} frames, ${(png.buffer.length / 1024).toFixed(0)}kB`);
  }
}

const zones = (await readdir(svgRoot, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

console.log(`Building atlases for ${zones.length} zone(s): ${zones.join(", ")}`);
for (const zone of zones) {
  await buildZone(zone);
}
console.log(`→ ${path.relative(root, outRoot)}`);
