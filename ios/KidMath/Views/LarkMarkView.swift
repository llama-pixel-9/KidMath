import SwiftUI

/// The larkit mark — five flat shapes on a 61×51 canvas, the same geometry as
/// the web SVG and the shipped favicons (design/larkit/README.md). No strokes,
/// no gradients. The lark always faces right; one bird per surface; never
/// rotate, stretch, or recolor outside the palette.
struct LarkMarkView: View {
    var color: Color = Theme.teal
    var accent: Color = Theme.sun
    var eye: Color = Theme.cream

    /// Natural aspect ratio (width / height) of the mark.
    static let aspectRatio: CGFloat = 61.0 / 51.0

    var body: some View {
        Canvas { context, size in
            let s = min(size.width / 61, size.height / 51)
            // The SVG viewBox is "0 1 61 51" — shift y up by 1 unit.
            let transform = CGAffineTransform(scaleX: s, y: s).translatedBy(x: 0, y: -1)

            var wing = Path()
            wing.move(to: CGPoint(x: 27, y: 24))
            wing.addCurve(to: CGPoint(x: 2, y: 6), control1: CGPoint(x: 19, y: 18), control2: CGPoint(x: 9, y: 12))
            wing.addCurve(to: CGPoint(x: 15, y: 42), control1: CGPoint(x: 5, y: 18), control2: CGPoint(x: 8, y: 31))
            wing.addCurve(to: CGPoint(x: 27, y: 24), control1: CGPoint(x: 20, y: 36), control2: CGPoint(x: 24, y: 29))
            wing.closeSubpath()

            var crest = Path()
            crest.move(to: CGPoint(x: 25, y: 17))
            crest.addCurve(to: CGPoint(x: 31, y: 3), control1: CGPoint(x: 24, y: 10), control2: CGPoint(x: 27, y: 5))
            crest.addCurve(to: CGPoint(x: 35, y: 18), control1: CGPoint(x: 31, y: 9), control2: CGPoint(x: 33, y: 14))
            crest.closeSubpath()

            let body = Path(ellipseIn: CGRect(x: 12, y: 14, width: 36, height: 36))

            var beak = Path()
            beak.move(to: CGPoint(x: 44, y: 22))
            beak.addLine(to: CGPoint(x: 61, y: 26))
            beak.addLine(to: CGPoint(x: 44, y: 31))
            beak.closeSubpath()

            var dart = Path()
            dart.move(to: CGPoint(x: 14, y: 32))
            dart.addLine(to: CGPoint(x: 37, y: 40))
            dart.addLine(to: CGPoint(x: 21, y: 48))
            dart.closeSubpath()

            let eyeDot = Path(ellipseIn: CGRect(x: 39 - 2.6, y: 24 - 2.6, width: 5.2, height: 5.2))

            context.fill(wing.applying(transform), with: .color(color))
            context.fill(crest.applying(transform), with: .color(color))
            context.fill(body.applying(transform), with: .color(color))
            context.fill(beak.applying(transform), with: .color(accent))
            // The accent wing dart is clipped to the body circle so it always
            // meets the edge cleanly.
            context.drawLayer { layer in
                layer.clip(to: body.applying(transform))
                layer.fill(dart.applying(transform), with: .color(accent))
            }
            context.fill(eyeDot.applying(transform), with: .color(eye))
        }
        .aspectRatio(Self.aspectRatio, contentMode: .fit)
        .accessibilityLabel("larkit")
    }
}

#Preview {
    VStack(spacing: 24) {
        LarkMarkView().frame(height: 72)
        LarkMarkView(color: .white, accent: .white, eye: Theme.ink)
            .frame(height: 72)
            .padding()
            .background(Theme.ink)
    }
    .padding()
    .background(Theme.cream)
}
