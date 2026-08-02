import SwiftUI

/// The feather set (brand spec §13) — same geometry as the web's
/// src/components/featherPaths.js: 24×24 box, 20px live area, 2px stroke,
/// round caps and joins. Ink by default, Cream on teal, Sun for a single
/// active state. The fourteen-icon list is closed.
enum FeatherGlyph: String {
    case nest, soundOn, soundOff, settings, back, close, print, star
    case streak, lock, check, next, replay, profile

    /// Primitive drawing ops mirroring the web data (absolute M/L/C/Z only).
    fileprivate var parts: [FeatherPart] {
        switch self {
        case .nest: return [
            .path("M4,11 C4,17 7.6,20 12,20 C16.4,20 20,17 20,11"),
            .line(4, 11, 20, 11),
            .circle(12, 6.5, 2.5),
        ]
        case .soundOn: return [
            .path("M5,10 L9,10 L13,6 L13,18 L9,14 L5,14 Z"),
            .path("M16.5,9 C18.5,10.5 18.5,13.5 16.5,15"),
        ]
        case .soundOff: return [
            .path("M5,10 L9,10 L13,6 L13,18 L9,14 L5,14 Z"),
            .line(16.5, 9.5, 20.5, 14.5),
            .line(20.5, 9.5, 16.5, 14.5),
        ]
        case .settings: return [
            .line(4, 7, 7, 7), .circle(9, 7, 2), .line(11, 7, 20, 7),
            .line(4, 12, 13, 12), .circle(15, 12, 2), .line(17, 12, 20, 12),
            .line(4, 17, 5, 17), .circle(7, 17, 2), .line(9, 17, 20, 17),
        ]
        case .back: return [.path("M14,6 L8,12 L14,18")]
        case .close: return [.line(7, 7, 17, 17), .line(17, 7, 7, 17)]
        case .print: return [
            .path("M8,9 L8,4 L16,4 L16,9"),
            .path("M8,16 L6,16 C4.9,16 4,15.1 4,14 L4,11 C4,9.9 4.9,9 6,9 L18,9 C19.1,9 20,9.9 20,11 L20,14 C20,15.1 19.1,16 18,16 L16,16"),
            .path("M8,13 L16,13 L16,20 L8,20 Z"),
        ]
        case .star: return [.path("M12,4 L19,12 L12,20 L5,12 Z")]
        case .streak: return [.path("M13,3 L6,14 L11,14 L10,21 L18,10 L13,10 Z")]
        case .lock: return [
            .path("M8,10 L8,7 C8,4.8 9.8,3 12,3 C14.2,3 16,4.8 16,7 L16,10"),
            .path("M7,10 L17,10 C18.1,10 19,10.9 19,12 L19,19 C19,20.1 18.1,21 17,21 L7,21 C5.9,21 5,20.1 5,19 L5,12 C5,10.9 5.9,10 7,10 Z"),
        ]
        case .check: return [.path("M5,13 L10,18 L19,7")]
        case .next: return [.path("M10,6 L16,12 L10,18")]
        case .replay: return [
            .path("M18,7.6 C16.7,5.7 14.5,4.5 12,4.5 C8.1,4.5 5,7.9 5,12 C5,16.1 8.1,19.5 12,19.5 C15.9,19.5 19,16.1 19,12"),
            .path("M18.4,3.6 L18,7.6 L14,7.2"),
        ]
        case .profile: return [
            .circle(12, 8, 3.5),
            .path("M5,20 C5,16.2 8,14 12,14 C16,14 19,16.2 19,20"),
        ]
        }
    }
}

private enum FeatherPart {
    case path(String)
    case line(CGFloat, CGFloat, CGFloat, CGFloat)
    case circle(CGFloat, CGFloat, CGFloat)
}

struct FeatherIcon: View {
    let glyph: FeatherGlyph
    var size: CGFloat = 24
    var color: Color = Theme.ink

    var body: some View {
        Canvas { context, canvasSize in
            let s = canvasSize.width / 24
            let transform = CGAffineTransform(scaleX: s, y: s)
            let style = StrokeStyle(lineWidth: 2 * s, lineCap: .round, lineJoin: .round)
            for part in glyph.parts {
                let path: Path
                switch part {
                case .path(let d):
                    path = Path(featherData: d)
                case .line(let x1, let y1, let x2, let y2):
                    var p = Path()
                    p.move(to: CGPoint(x: x1, y: y1))
                    p.addLine(to: CGPoint(x: x2, y: y2))
                    path = p
                case .circle(let cx, let cy, let r):
                    path = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: 2 * r, height: 2 * r))
                }
                context.stroke(path.applying(transform), with: .color(color), style: style)
            }
        }
        .frame(width: size, height: size)
    }
}

private extension Path {
    /// Minimal parser for the feather data subset: absolute M, L, C, Z with
    /// comma/space separated coordinates. Not a general SVG parser.
    init(featherData d: String) {
        self.init()
        var numbers: [CGFloat] = []
        var command: Character = " "
        var token = ""

        func flushToken() {
            if let value = Double(token) { numbers.append(CGFloat(value)) }
            token = ""
        }
        func apply() {
            switch command {
            case "M" where numbers.count >= 2:
                move(to: CGPoint(x: numbers[0], y: numbers[1]))
            case "L" where numbers.count >= 2:
                addLine(to: CGPoint(x: numbers[0], y: numbers[1]))
            case "C" where numbers.count >= 6:
                addCurve(
                    to: CGPoint(x: numbers[4], y: numbers[5]),
                    control1: CGPoint(x: numbers[0], y: numbers[1]),
                    control2: CGPoint(x: numbers[2], y: numbers[3])
                )
            default: break
            }
            numbers = []
        }

        for ch in d {
            switch ch {
            case "M", "L", "C", "Z":
                flushToken()
                apply()
                command = ch
                if ch == "Z" { closeSubpath() }
            case ",", " ":
                flushToken()
                if numbers.count == (command == "C" ? 6 : 2) { apply(); command = command == "M" ? "L" : command }
            default:
                token.append(ch)
            }
        }
        flushToken()
        apply()
    }
}

#Preview {
    LazyVGrid(columns: Array(repeating: GridItem(.fixed(56)), count: 5)) {
        ForEach(
            [FeatherGlyph.nest, .soundOn, .soundOff, .settings, .back, .close, .print,
             .star, .streak, .lock, .check, .next, .replay, .profile],
            id: \.rawValue
        ) { g in
            FeatherIcon(glyph: g, size: 44)
        }
    }
    .padding()
    .background(Theme.cream)
}
