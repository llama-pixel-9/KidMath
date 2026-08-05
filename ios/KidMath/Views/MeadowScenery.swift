import SwiftUI

/// The zone backdrops (§05) in the web's design units (1024×588, horizon at
/// y=400) — flat placeholder shapes matching src/engagement/meadow/
/// zoneScenes.jsx, positioned to carry the same named perches. Commissioned
/// art replaces these views without moving a slot.
struct ZoneBackdropView: View {
    let zoneId: String
    var nestBalance: Int?
    /// §12: the season changes ONLY the canopy/ground tint (nil = base).
    var season: String?

    private var t: Seasons.Tint { Seasons.tint(for: season) }

    private static let trunk = Color(red: 0.69, green: 0.54, blue: 0.41)
    private static let water = Color(red: 0.84, green: 0.93, blue: 0.95)
    private static let rock = Color(red: 0.62, green: 0.75, blue: 0.71)

    var body: some View {
        ZStack(alignment: .topLeading) {
            t.sky
            Rectangle().fill(t.farGrass)
                .frame(height: 70).offset(y: 358)
            Rectangle().fill(t.groundDeep)
                .frame(height: 178).offset(y: 410)
            Rectangle().fill(t.ground)
                .frame(height: 136).offset(y: 452)

            switch zoneId {
            case "pond":
                pond(x: 480, y: 520, rx: 330, ry: 54)
                tree(x: 356, canopyR: 78, trunkH: 104)
            case "woods":
                tree(x: 312, canopyR: 104, trunkH: 128)
                tree(x: 80, canopyR: 64, trunkH: 96)
                tree(x: 760, canopyR: 72, trunkH: 110)
                pond(x: 130, y: 516, rx: 100, ry: 28)
            case "cliffs":
                cliff(from: 0, peakX: 90, peakY: 170, to: 200)
                cliff(from: 640, peakX: 800, peakY: 120, to: 980)
                tree(x: 342, canopyR: 80, trunkH: 112)
                pond(x: 142, y: 510, rx: 110, ry: 30)
            default:
                tree(x: 330, canopyR: 96, trunkH: 120)
                pond(x: 150, y: 520, rx: 120, ry: 32)
            }

            fencePosts(x: 892)
            reeds(x: 700, y: 462)
            log(x: 566, y: 488)
            nestBox(x: 178, y: 336)
            feeder(x: 940, y: 372)

            if let nestBalance {
                nest(balance: nestBalance)
            }
        }
        .frame(width: 1024, height: 588)
        .clipped()
    }

    private func tree(x: CGFloat, canopyR: CGFloat, trunkH: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Self.trunk)
                .frame(width: 28, height: trunkH + 40)
                .position(x: x, y: 400 - trunkH + (trunkH + 40) / 2)
            Circle().fill(t.canopy).frame(width: canopyR * 2)
                .position(x: x, y: 400 - trunkH - canopyR * 0.62)
            Circle().fill(t.canopy).frame(width: canopyR * 1.24)
                .position(x: x - canopyR * 0.72, y: 400 - trunkH - canopyR * 0.28)
            Circle().fill(t.canopy).frame(width: canopyR * 1.16)
                .position(x: x + canopyR * 0.72, y: 400 - trunkH - canopyR * 0.3)
            Ellipse().fill(Color(red: 0.54, green: 0.42, blue: 0.31))
                .frame(width: 18, height: 24)
                .position(x: x, y: 384)
        }
    }

    private func pond(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat) -> some View {
        Ellipse()
            .fill(t.frozen ? Color(red: 0.92, green: 0.96, blue: 0.97) : Self.water)
            .overlay(Ellipse().stroke(t.groundDeep, lineWidth: 2))
            .frame(width: rx * 2, height: ry * 2)
            .position(x: x, y: y)
    }

    private func cliff(from: CGFloat, peakX: CGFloat, peakY: CGFloat, to: CGFloat) -> some View {
        Path { p in
            p.move(to: CGPoint(x: from, y: 375))
            p.addLine(to: CGPoint(x: peakX, y: peakY))
            p.addLine(to: CGPoint(x: to, y: 378))
            p.closeSubpath()
        }
        .fill(Self.rock)
    }

    private func fencePosts(x: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4).fill(Self.trunk)
                .frame(width: 16, height: 54).position(x: x, y: 447)
            RoundedRectangle(cornerRadius: 4).fill(Self.trunk)
                .frame(width: 16, height: 54).position(x: x + 76, y: 475)
            RoundedRectangle(cornerRadius: 4).fill(Self.trunk.opacity(0.8))
                .frame(width: 100, height: 8).position(x: x + 38, y: 438)
        }
    }

    private func reeds(x: CGFloat, y: CGFloat) -> some View {
        Path { p in
            for (index, dx) in [0, 14, 28, 96, 108].enumerated() {
                p.move(to: CGPoint(x: x + CGFloat(dx), y: y + 34))
                p.addLine(to: CGPoint(x: x + CGFloat(dx) + (index % 2 == 1 ? -6 : 6), y: y - 26))
            }
        }
        .stroke(t.groundDeep, style: StrokeStyle(lineWidth: 5, lineCap: .round))
    }

    private func log(x: CGFloat, y: CGFloat) -> some View {
        Capsule().fill(Self.trunk).frame(width: 88, height: 24).position(x: x, y: y)
    }

    private func nestBox(x: CGFloat, y: CGFloat) -> some View {
        ZStack {
            Rectangle().fill(Self.trunk).frame(width: 6, height: 430 - y)
                .position(x: x, y: y + (430 - y) / 2)
            RoundedRectangle(cornerRadius: 4).fill(Self.trunk)
                .frame(width: 32, height: 32).position(x: x, y: y - 14)
            Circle().fill(Theme.ink.opacity(0.7)).frame(width: 10).position(x: x, y: y - 14)
        }
    }

    private func feeder(x: CGFloat, y: CGFloat) -> some View {
        ZStack {
            Rectangle().fill(Self.trunk).frame(width: 6, height: 440 - y)
                .position(x: x, y: y + (440 - y) / 2)
            UnevenRoundedRectangle(topLeadingRadius: 6, topTrailingRadius: 6)
                .fill(Theme.sun)
                .frame(width: 52, height: 18)
                .position(x: x, y: y - 9)
        }
    }

    /// The Nest (§04): the star balance drawn literally — the only interface
    /// element that is scenery, and it never moves.
    private func nest(balance: Int) -> some View {
        ZStack {
            Circle()
                .trim(from: 0, to: 0.5)
                .fill(Color(red: 1, green: 0.99, blue: 0.96))
                .overlay(Circle().trim(from: 0, to: 0.5).stroke(Theme.ink, lineWidth: 3))
                .frame(width: 112, height: 112)
                .position(x: 330, y: 234)
            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { _ in
                    Rectangle().fill(Theme.sun)
                        .frame(width: 16, height: 16)
                        .rotationEffect(.degrees(45))
                        .cornerRadius(3)
                }
            }
            .position(x: 330, y: 278)
            VStack(spacing: 2) {
                Text("\(balance)")
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Color(red: 1, green: 0.99, blue: 0.96)))
                Text("THE NEST")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .kerning(1.4)
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }
            .position(x: 330, y: 344)
        }
    }
}

/// §05: the world ends at a hedge with a sign — a hard stop, nothing
/// rendered behind it.
struct HedgeView: View {
    let zone: FlockService.Zone
    let remaining: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            UnevenRoundedRectangle(topLeadingRadius: 34, topTrailingRadius: 34)
                .fill(Color(red: 0.24, green: 0.62, blue: 0.56))
                .frame(width: 300, height: 512)
                .offset(y: 76)
            VStack(spacing: 5) {
                Text(zone.name)
                    .font(.system(size: 19, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.ink)
                Text("opens at \(zone.unlockAt) birds")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Theme.ink.opacity(0.8))
                if remaining > 0 {
                    Text("\(remaining) more to go")
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundStyle(Theme.ember)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 1, green: 0.99, blue: 0.96))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2.5))
            )
            .frame(width: 300)
            .offset(y: 226)
            Rectangle()
                .fill(Color(red: 0.69, green: 0.54, blue: 0.41))
                .frame(width: 8, height: 130)
                .offset(x: 146, y: 300)
        }
        .frame(width: 300, height: 588, alignment: .topLeading)
    }
}
