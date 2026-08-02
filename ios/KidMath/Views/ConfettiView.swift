import SwiftUI

/// Radial confetti burst — port of ConfettiBurst.jsx: 12 dots fly outward
/// from the center, fading and shrinking over 0.8s.
struct ConfettiView: View {
    @State private var fired = false

    // Brand confetti (§11): Sun / Seafoam / Sun Light / Apricot only.
    private static let colors: [Color] = [
        Theme.sun, Theme.seafoam, Theme.sunLight, Theme.apricot,
    ]

    private struct Particle: Identifiable {
        let id: Int
        let offset: CGSize
        let color: Color
        let size: CGFloat
    }

    private static let particles: [Particle] = (0..<12).map { index in
        let angle = Double(index) / 12 * 2 * .pi
        let distance = 70.0 + Double(index % 4) * 12
        return Particle(
            id: index,
            offset: CGSize(width: cos(angle) * distance, height: sin(angle) * distance),
            color: colors[index % colors.count],
            size: CGFloat(10 + (index % 3) * 3)
        )
    }

    var body: some View {
        ZStack {
            ForEach(Self.particles) { particle in
                Circle()
                    .fill(particle.color)
                    .frame(width: particle.size, height: particle.size)
                    .offset(fired ? particle.offset : .zero)
                    .opacity(fired ? 0 : 1)
                    .scaleEffect(fired ? 0.2 : 1)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) { fired = true }
        }
    }
}
