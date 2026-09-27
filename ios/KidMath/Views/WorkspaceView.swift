import SwiftUI
import PencilKit

/// The scratch pad (handoff 2a · 07b): PencilKit on cream graph paper with
/// a 44pt toolbar — Pen (Ink pill while active), ink swatches Ink / Teal /
/// Sun, Eraser, Clear on the far right. Finger or Apple Pencil. Strokes stay
/// in memory; the caller re-keys the view per question, so it clears itself.
struct WorkspaceView: View {
    @Environment(\.theme) private var theme
    @State private var canvas = PKCanvasView()
    @State private var ink: Ink = .ink
    @State private var erasing = false

    enum Ink: CaseIterable {
        case ink, teal, sun
        var label: String { switch self { case .ink: return "Ink"; case .teal: return "Teal"; case .sun: return "Sun" } }
        var color: UIColor {
            switch self {
            case .ink: return UIColor(red: 0x14 / 255, green: 0x23 / 255, blue: 0x1F / 255, alpha: 1)
            case .teal: return UIColor(red: 0x0B / 255, green: 0x7A / 255, blue: 0x6A / 255, alpha: 1)
            case .sun: return UIColor(red: 0xF2 / 255, green: 0x6B / 255, blue: 0x3A / 255, alpha: 1)
            }
        }
        var swatch: Color { switch self { case .ink: return Theme.ink; case .teal: return Theme.teal; case .sun: return Theme.sun } }
    }

    var body: some View {
        ZStack(alignment: .top) {
            CanvasRepresentable(canvas: canvas)
            VStack {
                toolbar
                Spacer()
            }
            .padding(10)
        }
        .background(GraphPaperBackground())
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Theme.ink.opacity(0.12), lineWidth: 2))
        .onAppear { apply() }
        .accessibilityLabel("Scratch pad — draw to work the problem out")
    }

    private var toolbar: some View {
        HStack(spacing: 10) {
            Button { erasing = false; apply() } label: {
                Label("Pen", systemImage: "pencil")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(erasing ? Theme.ink : Theme.cream)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(Capsule().fill(erasing ? Color.white : Theme.ink))
                    .overlay(Capsule().stroke(Theme.ink.opacity(erasing ? 0.12 : 0), lineWidth: 1.5))
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(erasing ? [] : .isSelected)
            ForEach(Ink.allCases, id: \.self) { swatch in
                let active = !erasing && ink == swatch
                Button { ink = swatch; erasing = false; apply() } label: {
                    Circle().fill(swatch.swatch)
                        .frame(width: 30, height: 30)
                        .overlay(Circle().stroke(Theme.ink, lineWidth: active ? 2.5 : 0).padding(-3))
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(swatch.label)
                .accessibilityAddTraits(active ? .isSelected : [])
            }
            Button { erasing = true; apply() } label: {
                Text("Eraser")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(erasing ? Theme.cream : Theme.ink)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(Capsule().fill(erasing ? Theme.ink : Color.white))
                    .overlay(Capsule().stroke(Theme.ink.opacity(erasing ? 0 : 0.12), lineWidth: 1.5))
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(erasing ? .isSelected : [])
            Spacer()
            Button { canvas.drawing = PKDrawing() } label: {
                Text("Clear")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(Capsule().fill(Color.white))
                    .overlay(Capsule().stroke(Theme.ink.opacity(0.12), lineWidth: 1.5))
            }
            .buttonStyle(.plain)
        }
    }

    private func apply() {
        canvas.tool = erasing ? PKEraserTool(.bitmap, width: 26) : PKInkingTool(.pen, color: ink.color, width: 3.2)
    }
}

private struct CanvasRepresentable: UIViewRepresentable {
    let canvas: PKCanvasView
    func makeUIView(context: Context) -> PKCanvasView {
        canvas.drawingPolicy = .anyInput   // finger and Pencil both draw
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        return canvas
    }
    func updateUIView(_ uiView: PKCanvasView, context: Context) {}
}
