# Coin artwork

Photographs of real US coins, used by the money mode's coin tray (web) and
`CoinTrayWidget` (iOS — same PNGs, mirrored into
`ios/KidMath/Assets.xcassets/Coins/`).

Regenerate with `python3 scripts/buildCoinAssets.py` (needs Pillow). The build
crops each source to the coin, cuts it to a circle, and writes a 256px PNG.

## Provenance

All four are United States Mint renders hosted on Wikimedia Commons. Works
prepared by an officer or employee of the US federal government as part of their
official duties are not subject to copyright in the United States
([17 U.S.C. § 105](https://www.law.cornell.edu/uscode/text/17/105)); Commons
tags these `PD-USGov-Money`. The build script re-checks the license on every run
and refuses to bundle a file that is not marked public domain.

| File | Coin | Commons source |
| --- | --- | --- |
| `penny.png` | 2013-S Lincoln cent | [US One Cent Obv.png](https://commons.wikimedia.org/wiki/File:US_One_Cent_Obv.png) |
| `nickel.png` | 2004-P Jefferson nickel | [Jefferson-Nickel-Unc-Obv.jpg](https://commons.wikimedia.org/wiki/File:Jefferson-Nickel-Unc-Obv.jpg) |
| `dime.png` | 2013-S Roosevelt dime | [Dime Obverse 13.png](https://commons.wikimedia.org/wiki/File:Dime_Obverse_13.png) |
| `quarter.png` | 2021-P Washington quarter | [2021-P US Quarter Obverse.jpg](https://commons.wikimedia.org/wiki/File:2021-P_US_Quarter_Obverse.jpg) |

## Reproduction rules

31 CFR 92.2 governs reproductions of US coins. Illustrations of coins for
educational, historical, and numismatic purposes are permitted; these are
obverse faces shown at educational size inside a math exercise, which is
squarely within that. Do not reuse them in a way that implies Mint endorsement.
