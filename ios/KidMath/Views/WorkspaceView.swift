import SwiftUI
import PencilKit

/// The work space — port of Scratchpad.jsx on PencilKit: pen in three inks,
/// eraser, undo, clear. Apple Pencil pressure widens the line; finger
/// drawing works too. Re-keyed per question by the caller (`.id(questionKey)`).
struct WorkspaceView: View {
    @Environment(\.theme) private var theme
    @State private var canvas = PKCanvasView()
    @State private var tool: Tool = .ink

    enum Tool: String, CaseIterable {
        case ink, teal, ember, eraser
        var label: String {
            switch self { case .ink: return "Ink"; case .teal: return "Teal"; case .ember: return "Ember"; case .eraser: return "Eraser" }
        }
        var color: UIColor? {
            switch self {
            case .ink: return UIColor(red: 0x14 / 255, green: 0x23 / 255, blue: 0x1F / 255, alpha: 1)
            case .teal: return UIColor(red: 0x0B / 255, green: 0x7A / 255, blue: 0x6A / 255, alpha: 1)
            case .ember: return UIColor(red: 0xC4 / 255, green: 0x47 / 255, blue: 0x1B / 255, alpha: 1)
            case .eraser: return nil
            }
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                ForEach(Tool.allCases, id: \.self) { t in
                    Button { tool = t; apply(t) } label: {
                        Group {
                            if let c = t.color {
                                Circle().fill(Color(c)).frame(width: 22, height: 22)
                            } else {
                                Image(systemName: "eraser.fill").font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.ink)
                            }
                        }
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(tool == t ? Theme.seafoam : Color.white))
                        .overlay(Circle().stroke(tool == t ? Theme.teal : Theme.ink.opacity(0.12), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(t.label)
                    .accessibilityAddTraits(tool == t ? .isSelected : [])
                }
                Spacer()
                Button { canvas.undoManager?.undo() } label: { Image(systemName: "arrow.uturn.backward").font(.system(size: 15, weight: .bold)) }
                    .buttonStyle(.plain).foregroundStyle(Theme.ink).frame(width: 36, height: 36)
                    .accessibilityLabel("Undo")
                Button { canvas.drawing = PKDrawing() } label: { Image(systemName: "trash").font(.system(size: 15, weight: .bold)) }
                    .buttonStyle(.plain).foregroundStyle(Theme.ink).frame(width: 36, height: 36)
                    .accessibilityLabel("Clear")
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)

            CanvasRepresentable(canvas: canvas)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink.opacity(0.1), lineWidth: 1.5))
                .padding([.horizontal, .bottom], 12)
        }
        .onAppear { apply(tool) }
        .accessibilityLabel("Work space — draw to work the problem out")
    }

    private func apply(_ t: Tool) {
        if let c = t.color {
            canvas.tool = PKInkingTool(.pen, color: c, width: 3.2)
        } else {
            canvas.tool = PKEraserTool(.bitmap, width: 26)
        }
    }
}

private struct CanvasRepresentable: UIViewRepresentable {
    let canvas: PKCanvasView
    func makeUIView(context: Context) -> PKCanvasView {
        canvas.drawingPolicy = .anyInput   // finger and Pencil both draw
        canvas.backgroundColor = .white
        canvas.isOpaque = true
        return canvas
    }
    func updateUIView(_ uiView: PKCanvasView, context: Context) {}
}
