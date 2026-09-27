import SwiftUI

/// Brand §07 graph paper: cream base, minor 24pt lines at teal 5%, major
/// 120pt lines at teal 8%, 1pt, origin top-left, never scaled. Every cream
/// screen except the Practice background (§12) and the inside of the
/// scratch pad.
struct GraphPaperBackground: View {
    var base: Color = Theme.cream

    var body: some View {
        Canvas(opaque: true, rendersAsynchronously: true) { context, size in
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(base))
            var minor = Path()
            var major = Path()
            var x: CGFloat = 0
            var index = 0
            while x <= size.width {
                let line = Path { $0.move(to: CGPoint(x: x + 0.5, y: 0)); $0.addLine(to: CGPoint(x: x + 0.5, y: size.height)) }
                if index % 5 == 0 { major.addPath(line) } else { minor.addPath(line) }
                x += 24; index += 1
            }
            var y: CGFloat = 0
            index = 0
            while y <= size.height {
                let line = Path { $0.move(to: CGPoint(x: 0, y: y + 0.5)); $0.addLine(to: CGPoint(x: size.width, y: y + 0.5)) }
                if index % 5 == 0 { major.addPath(line) } else { minor.addPath(line) }
                y += 24; index += 1
            }
            context.stroke(minor, with: .color(Theme.teal.opacity(0.05)), lineWidth: 1)
            context.stroke(major, with: .color(Theme.teal.opacity(0.08)), lineWidth: 1)
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }
}
