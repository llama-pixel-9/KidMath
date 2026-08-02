import SwiftUI

/// Shared visual kit for answer widgets — Swift port of src/components/kit.
/// One color/stroke vocabulary so a coin, a shape, and a number line read as
/// one system.
/// Three-role diagram palette (brand spec §10): Ink is what is given,
/// Teal (`accent`) is the part in question, Sun (`warm`) is the measurement
/// drawn on top. Nothing else gets a color.
enum FigureColors {
    static let ink = Theme.ink
    static let inkSoft = Theme.ink.opacity(0.6)
    static let fill = Theme.seafoam
    static let accent = Theme.teal
    static let warm = Theme.sun
}

/// Digit pad used by the figure widgets (clock, graph, angle, bond, discs,
/// bar model, fraction set) — port of FigureDigitPad.jsx: 1-9, ⌫, 0, Go.
struct DigitPadView: View {
    @Environment(\.theme) private var theme
    @Binding var entry: String
    var maxLength = 4
    let submit: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            ForEach([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]], id: \.self) { row in
                HStack(spacing: 8) {
                    ForEach(row, id: \.self) { digit in
                        key(digit) { press(digit) }
                    }
                }
            }
            HStack(spacing: 8) {
                key("⌫") { if !entry.isEmpty { entry.removeLast() } }
                key("0") { press("0") }
                Button(action: { if !entry.isEmpty { submit() } }) {
                    Text("Go")
                        .font(.title3.weight(.heavy))
                        .fontDesign(.rounded)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.teal))
                        .background(
                            RoundedRectangle(cornerRadius: 14).fill(Theme.deepTeal).offset(y: 4)
                        )
                        .foregroundStyle(Theme.cream)
                        .opacity(entry.isEmpty ? 0.4 : 1)
                }
                .disabled(entry.isEmpty)
                .buttonStyle(SpringButtonStyle())
            }
        }
        .frame(maxWidth: 380)
    }

    private func press(_ digit: String) {
        if entry.count < maxLength { entry += digit }
    }

    private func key(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(RoundedRectangle(cornerRadius: 14).fill(.white))
                .foregroundStyle(theme.textPrimary)
        }
        .buttonStyle(SpringButtonStyle())
    }
}

/// The big readout above a digit pad ("—" until the child types).
struct EntryReadout: View {
    @Environment(\.theme) private var theme
    let entry: String
    var suffix = ""

    var body: some View {
        Text(entry.isEmpty ? "—" : entry + suffix)
            .font(.system(size: 30, weight: .heavy, design: .rounded))
            .foregroundStyle(entry.isEmpty ? theme.textMuted : theme.textPrimary)
            .frame(minHeight: 36)
    }
}

// MARK: - Shape geometry (port of kit/shapeData.js + kit/shapes.jsx)

enum ShapeData {
    /// Vertices of a regular n-gon inscribed in the unit box — exact by
    /// construction so symmetry === sides (see shapeData.js for why).
    private static func regular(_ n: Int, rotationDeg: Double = 0, r: Double = 0.45) -> [CGPoint] {
        let rot = rotationDeg * .pi / 180
        return (0..<n).map { i in
            let a = rot - .pi / 2 + Double(i) * 2 * .pi / Double(n)
            return CGPoint(x: 0.5 + r * cos(a), y: 0.5 + r * sin(a))
        }
    }

    static let shapes: [String: [CGPoint]] = [
        "triangleEquilateral": regular(3),
        "square": regular(4, rotationDeg: 45),
        "pentagon": regular(5),
        "hexagon": regular(6, rotationDeg: 30),
        "octagon": regular(8, rotationDeg: 22.5),
        "triangleRight": [CGPoint(x: 0.12, y: 0.2), CGPoint(x: 0.12, y: 0.9), CGPoint(x: 0.95, y: 0.9)],
        "triangleScalene": [CGPoint(x: 0.2, y: 0.12), CGPoint(x: 0.95, y: 0.6), CGPoint(x: 0.05, y: 0.9)],
        "rectangle": [CGPoint(x: 0.05, y: 0.25), CGPoint(x: 0.95, y: 0.25), CGPoint(x: 0.95, y: 0.75), CGPoint(x: 0.05, y: 0.75)],
        "rhombus": [CGPoint(x: 0.5, y: 0.2), CGPoint(x: 0.95, y: 0.5), CGPoint(x: 0.5, y: 0.8), CGPoint(x: 0.05, y: 0.5)],
        "parallelogram": [CGPoint(x: 0.25, y: 0.2), CGPoint(x: 0.95, y: 0.2), CGPoint(x: 0.75, y: 0.8), CGPoint(x: 0.05, y: 0.8)],
        "trapezoid": [CGPoint(x: 0.28, y: 0.2), CGPoint(x: 0.72, y: 0.2), CGPoint(x: 0.95, y: 0.8), CGPoint(x: 0.05, y: 0.8)],
        "openFigure": [CGPoint(x: 0.1, y: 0.9), CGPoint(x: 0.3, y: 0.15), CGPoint(x: 0.7, y: 0.15), CGPoint(x: 0.9, y: 0.9)],
    ]

    static func hasSymmetry(_ shape: String) -> Bool {
        !["triangleRight", "triangleScalene", "parallelogram", "openFigure"].contains(shape)
    }
}

/// Draws one plane figure — port of Figure in kit/shapes.jsx. Open figures
/// (non-polygons, a deliberate non-example) render as an open stroke.
struct FigureView: View {
    let shape: String
    var size: CGFloat = 90
    var rotate: Double = 0
    var showSymmetry = false

    var body: some View {
        Canvas { context, canvasSize in
            let points = (ShapeData.shapes[shape] ?? ShapeData.shapes["square"]!)
                .map { CGPoint(x: $0.x * canvasSize.width, y: $0.y * canvasSize.height) }
            var path = Path()
            path.move(to: points[0])
            for point in points.dropFirst() { path.addLine(to: point) }
            let closed = shape != "openFigure"
            if closed { path.closeSubpath() }

            var ctx = context
            if rotate != 0 {
                ctx.translateBy(x: canvasSize.width / 2, y: canvasSize.height / 2)
                ctx.rotate(by: .degrees(rotate))
                ctx.translateBy(x: -canvasSize.width / 2, y: -canvasSize.height / 2)
            }
            if closed {
                ctx.fill(path, with: .color(FigureColors.fill))
            }
            ctx.stroke(path, with: .color(FigureColors.ink), style: StrokeStyle(lineWidth: 2.5, lineJoin: .round))

            if showSymmetry, ShapeData.hasSymmetry(shape) {
                var axis = Path()
                axis.move(to: CGPoint(x: canvasSize.width / 2, y: 0))
                axis.addLine(to: CGPoint(x: canvasSize.width / 2, y: canvasSize.height))
                ctx.stroke(axis, with: .color(FigureColors.accent), style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
            }
        }
        .frame(width: size, height: size)
    }
}
