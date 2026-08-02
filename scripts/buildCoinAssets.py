#!/usr/bin/env python3
"""Build the coin tray artwork from the United States Mint's own coin images.

The tray used to draw flat SVG discs with the value stamped on the face. That
was wrong twice over: children learn coins by *appearance* (Lincoln, the reeded
rim, the copper), and a face reading "10¢" turns coin recognition into plain
addition. So the tray now shows photographs of the real thing.

Sources are US Mint renders on Wikimedia Commons. Works of the US federal
government are public domain (17 USC 105); see public/coins/README.md for the
per-file provenance that ships with the assets.

Output is committed, so you only need to run this to change or re-source the
art:

    pip install Pillow
    python3 scripts/buildCoinAssets.py

Each source is cropped to the coin, cut to a circle, and written at 256px —
about 3x the largest tray size (a quarter draws at ~56pt), so it stays sharp on
retina without carrying a photo's worth of bytes.
"""

import json
import os
import subprocess
import sys
import urllib.parse

from PIL import Image, ImageChops, ImageDraw

API = "https://commons.wikimedia.org/w/api.php"
UA = "KidMathAssetBuild/1.0 (educational app; https://github.com/ — contact via repo)"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_OUT = os.path.join(ROOT, "public", "coins")
IOS_OUT = os.path.join(ROOT, "ios", "KidMath", "Assets.xcassets", "Coins")
RAW = os.path.join(ROOT, ".cache", "coin-src")

SIZE = 256

# background: "alpha" — the upload already has a cut-out coin on transparency
#             "white" — the coin sits on a flat white field we crop away
COINS = {
    "penny":   {"title": "File:US One Cent Obv.png",           "background": "alpha"},
    "nickel":  {"title": "File:Jefferson-Nickel-Unc-Obv.jpg",  "background": "white"},
    "dime":    {"title": "File:Dime Obverse 13.png",           "background": "alpha"},
    "quarter": {"title": "File:2021-P US Quarter Obverse.jpg", "background": "white"},
}


def fetch(title, dest):
    """Download the 960px thumbnail of a Commons file. Plenty for a 256px cut."""
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": "960", "titles": title,
    })
    meta = subprocess.run(
        ["curl", "-sS", "--fail", "--max-time", "60", "-A", UA, f"{API}?{query}"],
        capture_output=True, text=True, check=True,
    )
    pages = json.loads(meta.stdout)["query"]["pages"]
    page = next(iter(pages.values()))
    if "imageinfo" not in page:
        raise SystemExit(f"Commons has no file named {title!r} — did it get renamed?")
    info = page["imageinfo"][0]
    license_name = info.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "")
    if "public domain" not in license_name.lower():
        raise SystemExit(f"{title} is licensed {license_name!r}, not public domain — refusing to bundle it")
    subprocess.run(
        ["curl", "-sS", "--fail", "--max-time", "60", "-A", UA, "-o", dest,
         info.get("thumburl") or info["url"]],
        check=True,
    )
    return license_name


def coin_bbox(image, background):
    if background == "alpha":
        return image.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    # Near-white is the paper, anything darker is coin. Proof coins have bright
    # highlights but never a fully blown-out field, so 246 is a safe cut.
    return image.convert("L").point(lambda v: 0 if v > 246 else 255).getbbox()


def build(name, spec):
    source = os.path.join(RAW, f"{name}.img")
    if not os.path.exists(source):
        fetch(spec["title"], source)

    image = Image.open(source).convert("RGBA")
    left, top, right, bottom = coin_bbox(image, spec["background"])
    half = max(right - left, bottom - top) / 2
    cx, cy = (left + right) / 2, (top + bottom) / 2
    image = image.crop((round(cx - half), round(cy - half), round(cx + half), round(cy + half)))

    # Cut the circle at 4x and downsample, which antialiases the rim for free.
    supersampled = SIZE * 4
    image = image.resize((supersampled, supersampled), Image.LANCZOS)
    mask = Image.new("L", (supersampled, supersampled), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, supersampled - 1, supersampled - 1), fill=255)
    if spec["background"] == "alpha":
        mask = ImageChops.multiply(mask, image.getchannel("A"))
    image.putalpha(mask)
    image = image.resize((SIZE, SIZE), Image.LANCZOS)

    # A coin is a handful of metal tones; a 255-colour palette is visually
    # lossless here and cuts each file from ~65 KB to ~20 KB.
    return image.quantize(colors=255, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)


def ios_imageset(name, image):
    """Write an Xcode imageset. One 3x file — iOS downsamples for 1x/2x."""
    folder = os.path.join(IOS_OUT, f"{name}.imageset")
    os.makedirs(folder, exist_ok=True)
    image.save(os.path.join(folder, f"{name}.png"), optimize=True)
    with open(os.path.join(folder, "Contents.json"), "w") as handle:
        json.dump({
            "images": [{"filename": f"{name}.png", "idiom": "universal", "scale": "3x"}],
            "info": {"author": "xcode", "version": 1},
        }, handle, indent=2)
        handle.write("\n")


def main():
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(WEB_OUT, exist_ok=True)
    os.makedirs(IOS_OUT, exist_ok=True)
    with open(os.path.join(IOS_OUT, "Contents.json"), "w") as handle:
        json.dump({"info": {"author": "xcode", "version": 1}}, handle, indent=2)
        handle.write("\n")

    for name, spec in COINS.items():
        image = build(name, spec)
        web_path = os.path.join(WEB_OUT, f"{name}.png")
        image.save(web_path, optimize=True)
        ios_imageset(name, image)
        print(f"{name:8} {spec['title']:42} {os.path.getsize(web_path) // 1024:3} KB")


if __name__ == "__main__":
    sys.exit(main())
