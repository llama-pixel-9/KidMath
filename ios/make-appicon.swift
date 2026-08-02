// Renders AppIcon.png (1024×1024, opaque) from the larkit mark geometry —
// the same five shapes as design/larkit/brand/larkit-mark.svg, full color on
// cream, matching the shipped apple-touch-icon. Run from the repo root:
//
//   swift ios/make-appicon.swift
//
// Rewrites ios/KidMath/Assets.xcassets/AppIcon.appiconset/AppIcon.png.

import CoreGraphics
import ImageIO
import Foundation
import UniformTypeIdentifiers

let size = 1024
let cream = CGColor(red: 1.0, green: 251.0 / 255, blue: 235.0 / 255, alpha: 1)
let teal = CGColor(red: 11.0 / 255, green: 122.0 / 255, blue: 106.0 / 255, alpha: 1)
let sun = CGColor(red: 242.0 / 255, green: 107.0 / 255, blue: 58.0 / 255, alpha: 1)

guard let ctx = CGContext(
    data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fatalError("no context") }

ctx.setFillColor(cream)
ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))

// Mark geometry lives in a 61×51 box (viewBox "0 1 61 51"). Scale it to ~62%
// of the canvas width and center it, flipping y for CoreGraphics.
let markWidth: CGFloat = 640
let s = markWidth / 61
let ox = (CGFloat(size) - 61 * s) / 2
let oy = (CGFloat(size) - 51 * s) / 2
ctx.translateBy(x: ox, y: CGFloat(size) - oy)
ctx.scaleBy(x: s, y: -s)
ctx.translateBy(x: 0, y: -1)

func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x, y: y) }

let wing = CGMutablePath()
wing.move(to: pt(27, 24))
wing.addCurve(to: pt(2, 6), control1: pt(19, 18), control2: pt(9, 12))
wing.addCurve(to: pt(15, 42), control1: pt(5, 18), control2: pt(8, 31))
wing.addCurve(to: pt(27, 24), control1: pt(20, 36), control2: pt(24, 29))
wing.closeSubpath()

let crest = CGMutablePath()
crest.move(to: pt(25, 17))
crest.addCurve(to: pt(31, 3), control1: pt(24, 10), control2: pt(27, 5))
crest.addCurve(to: pt(35, 18), control1: pt(31, 9), control2: pt(33, 14))
crest.closeSubpath()

let body = CGPath(ellipseIn: CGRect(x: 12, y: 14, width: 36, height: 36), transform: nil)

let beak = CGMutablePath()
beak.move(to: pt(44, 22))
beak.addLine(to: pt(61, 26))
beak.addLine(to: pt(44, 31))
beak.closeSubpath()

let dart = CGMutablePath()
dart.move(to: pt(14, 32))
dart.addLine(to: pt(37, 40))
dart.addLine(to: pt(21, 48))
dart.closeSubpath()

let eye = CGPath(ellipseIn: CGRect(x: 39 - 2.6, y: 24 - 2.6, width: 5.2, height: 5.2), transform: nil)

for path in [wing, crest] { ctx.addPath(path); ctx.setFillColor(teal); ctx.fillPath() }
ctx.addPath(body); ctx.setFillColor(teal); ctx.fillPath()
ctx.addPath(beak); ctx.setFillColor(sun); ctx.fillPath()
// Dart clipped to the body circle so it meets the edge cleanly.
ctx.saveGState()
ctx.addPath(body); ctx.clip()
ctx.addPath(dart); ctx.setFillColor(sun); ctx.fillPath()
ctx.restoreGState()
ctx.addPath(eye); ctx.setFillColor(cream); ctx.fillPath()

let image = ctx.makeImage()!
let url = URL(fileURLWithPath: "ios/KidMath/Assets.xcassets/AppIcon.appiconset/AppIcon.png")
let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, image, nil)
CGImageDestinationFinalize(dest)
print("wrote \(url.path)")
