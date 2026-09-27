import SwiftUI
import PencilKit

/// The work space (handoff 2a · 07b): PencilKit on cream graph paper. An
/// 84pt white header (teal pencil, "Work space", a close circle), then the
/// toolbar — Pen (Ink pill while active), inks Ink / Teal / Sun, Eraser, and
/// Undo + Clear on the right — and the pad with "Work it out here" until the
/// first stroke. Finger or Apple Pencil; strokes stay in memory. The caller
/// re-keys the view per question, so it clears itself.
struct WorkspaceView: View {
    @Environment(\.theme) private var theme
    /// Closes the drawer / sheet.
    var onClose: (() -> Void)?
    @State private var canvas = PKCanvasView()
    @State private var ink: Ink = .ink
    @State private var erasing = false
    @State private var hasStrokes = false

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
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: "pencil").font(.system(size: 20, weight: .semibold)).foregroundStyle(Theme.teal)
                Text("Work space").font(theme.displayFont(size: 24)).foregroundStyle(Theme.ink)
                Spacer()
                if let onClose {
                    Button(action: onClose) {
                        Image(systemName: "xmark").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.ink)
                            .frame(width: 44, height: 44)
                            .background(Circle().stroke(Theme.ink.opacity(0.12), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Close the work space")
                }
            }
            .padding(.horizontal, 20)
            .frame(height: 84)
            .background(Color.white)

            toolbar
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.white)
            Rectangle().fill(Theme.ink.opacity(0.08)).frame(height: 1)

            ZStack {
                CanvasRepresentable(canvas: canvas, onStroke: { hasStrokes = true })
                if !hasStrokes {
                    Text("Work it out here")
                        .font(theme.bodyFont(size: 17, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(0.6))
                        .padding(.top, 36)
                        .frame(maxHeight: .infinity, alignment: .top)
                        .allowsHitTesting(false)
                }
            }
            .background(GraphPaperBackground())
        }
        .onAppear { apply() }
        .accessibilityLabel("Work space — draw to work the problem out")
    }

    private var toolbar: some View {
        HStack(spacing: 8) {
            Button { erasing = false; apply() } label: {
                Label("Pen", systemImage: "pencil")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(erasing ? Theme.ink : Theme.cream)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(RoundedRectangle(cornerRadius: 12).fill(erasing ? Color.white : Theme.ink))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink.opacity(erasing ? 0.12 : 0), lineWidth: 1.5))
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(erasing ? [] : .isSelected)
            ForEach(Ink.allCases, id: \.self) { swatch in
                let active = !erasing && ink == swatch
                Button { ink = swatch; erasing = false; apply() } label: {
                    Circle().fill(swatch.swatch)
                        .frame(width: 28, height: 28)
                        .overlay(Circle().stroke(Theme.ink, lineWidth: active ? 2.5 : 0).padding(-3))
                        .frame(width: 40, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(swatch.label)
                .accessibilityAddTraits(active ? .isSelected : [])
            }
            toolButton("Eraser", icon: "eraser", active: erasing) { erasing = true; apply() }
            Spacer(minLength: 4)
            toolButton("Undo", icon: nil, active: false) { canvas.undoManager?.undo() }
            toolButton("Clear", icon: nil, active: false) { canvas.drawing = PKDrawing(); hasStrokes = false }
        }
    }

    private func toolButton(_ label: String, icon: String?, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon { Image(systemName: icon).font(.system(size: 13, weight: .semibold)) }
                Text(label).font(theme.bodyFont(size: 14, weight: .bold))
            }
            .foregroundStyle(active ? Theme.cream : Theme.ink)
            .padding(.horizontal, 12)
            .frame(height: 44)
            .background(RoundedRectangle(cornerRadius: 12).fill(active ? Theme.ink : Color.white))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink.opacity(active ? 0 : 0.12), lineWidth: 1.5))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? .isSelected : [])
    }

    private func apply() {
        canvas.tool = erasing ? PKEraserTool(.bitmap, width: 26) : PKInkingTool(.pen, color: ink.color, width: 3.2)
    }
}

private struct CanvasRepresentable: UIViewRepresentable {
    let canvas: PKCanvasView
    var onStroke: () -> Void = {}

    func makeCoordinator() -> Coordinator { Coordinator(onStroke: onStroke) }

    func makeUIView(context: Context) -> PKCanvasView {
        canvas.drawingPolicy = .anyInput   // finger and Pencil both draw
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.delegate = context.coordinator
        return canvas
    }
    func updateUIView(_ uiView: PKCanvasView, context: Context) {}

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        let onStroke: () -> Void
        init(onStroke: @escaping () -> Void) { self.onStroke = onStroke }
        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            if !canvasView.drawing.strokes.isEmpty { onStroke() }
        }
    }
}
