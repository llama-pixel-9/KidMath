import SwiftUI

/// Parental gate — required by App Store review for Kids-category apps
/// before any purchase flow or external link. The challenge is an adult
/// task: arithmetic with the operands SPELLED OUT, so pre-readers can't
/// pattern-match digits into the pad. The sum is always two digits.
enum ParentalGate {
    struct Challenge {
        let question: String
        let answer: Int
    }

    static func makeChallenge(a: Int = Int.random(in: 21...49), b: Int = Int.random(in: 17...38)) -> Challenge {
        let formatter = NumberFormatter()
        formatter.numberStyle = .spellOut
        formatter.locale = Locale(identifier: "en_US")
        let aWords = formatter.string(from: NSNumber(value: a)) ?? "\(a)"
        let bWords = formatter.string(from: NSNumber(value: b)) ?? "\(b)"
        return Challenge(question: "What is \(aWords) plus \(bWords)?", answer: a + b)
    }
}

/// The grown-up check (handoff 2a · 02): lock, "Grown-ups only from here",
/// the question in words, two digit slots, a neutral 3×4 keypad whose bottom
/// row is Cancel / 0 / backspace. It checks itself on the second digit — no
/// Go key — and a miss clears the slots and asks a new question.
///
/// Presented inside a `.sheet` (a form sheet on iPad, a bottom sheet on
/// iPhone) or, on the Welcome screen, inside `GateOverlay`.
struct ParentalGateView: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    /// Runs after the gate is passed (it closes itself first).
    let onPass: () -> Void
    /// How the gate closes; the presentation's dismiss unless the host says otherwise.
    var onClose: (() -> Void)?

    /// Three wrong answers lock the gate for a minute, and the lock persists
    /// across presentations (UserDefaults) — without it a child could just
    /// reopen the sheet for three fresh guesses, forever.
    static let lockoutSeconds: TimeInterval = 60
    private static let lockoutUntilKey = "kidmath-parental-gate-lockout-until"

    static var lockedOutUntil: Date? {
        let until = UserDefaults.standard.double(forKey: lockoutUntilKey)
        guard until > Date().timeIntervalSince1970 else { return nil }
        return Date(timeIntervalSince1970: until)
    }

    private static func startLockout() {
        UserDefaults.standard.set(
            Date().addingTimeInterval(lockoutSeconds).timeIntervalSince1970,
            forKey: lockoutUntilKey
        )
    }

    @State private var challenge = ParentalGate.makeChallenge()
    @State private var entry = ""
    @State private var attemptsLeft = 3
    @State private var shake = false
    @State private var lockedOut = ParentalGateView.lockedOutUntil != nil

    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: "lock")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(Theme.ink)
            Text("Grown-ups only from here")
                .font(theme.displayFont(size: 28))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.8)
                .lineLimit(1)
                .padding(.top, 16)

            if lockedOut {
                Text("Too many tries. The lock opens again in a minute — come back then.")
                    .font(theme.bodyFont(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 28)
                Button("Cancel") { close() }
                    .font(theme.bodyFont(size: 16, weight: .bold))
                    .foregroundStyle(Theme.ink.opacity(0.6))
            } else {
                Text(challenge.question)
                    .font(theme.bodyFont(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.top, 10)

                HStack(spacing: 14) {
                    slot(0)
                    slot(1)
                }
                .padding(.top, 22)
                .offset(x: shake ? -8 : 0)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(entry.isEmpty ? "No digits entered" : "Entered \(entry)")

                keypad
                    .padding(.top, 20)

                Text("Checks automatically on the second digit.")
                    .font(theme.bodyFont(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.6))
                    .padding(.top, 18)
            }
        }
        .padding(36)
        .frame(maxWidth: 440)
        .background(Theme.cream)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(32)
        .presentationBackground(Theme.cream)
        .onAppear { lockedOut = ParentalGateView.lockedOutUntil != nil }
    }

    private func slot(_ i: Int) -> some View {
        let digit = entry.count > i ? String(entry[entry.index(entry.startIndex, offsetBy: i)]) : ""
        let active = entry.count == i
        return Text(digit)
            .font(theme.displayFont(size: 28))
            .foregroundStyle(Theme.ink)
            .frame(width: 56, height: 64)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.white))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(active ? Theme.teal : Theme.ink.opacity(0.12), lineWidth: active ? 2 : 1.5))
    }

    private var keypad: some View {
        let rows: [[String]] = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["cancel", "0", "back"]]
        return VStack(spacing: 10) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 10) {
                    ForEach(row, id: \.self) { key in
                        switch key {
                        case "cancel":
                            Button("Cancel") { close() }
                                .font(theme.bodyFont(size: 16, weight: .bold))
                                .foregroundStyle(Theme.ink.opacity(0.6))
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                        case "back":
                            Button { if !entry.isEmpty { entry.removeLast() } } label: {
                                Image(systemName: "delete.left")
                                    .font(.system(size: 22, weight: .medium))
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 56)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Delete")
                        default:
                            Button { tap(key) } label: {
                                Text(key)
                                    .font(theme.bodyFont(size: 24, weight: .bold))
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 56)
                                    .background(RoundedRectangle(cornerRadius: 14).fill(Color.white))
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink.opacity(0.12), lineWidth: 1.5))
                            }
                            .buttonStyle(SpringButtonStyle())
                        }
                    }
                }
            }
        }
    }

    private func tap(_ digit: String) {
        guard entry.count < 2 else { return }
        entry.append(digit)
        if entry.count == 2 { submit() }
    }

    private func close() {
        if let onClose { onClose() } else { dismiss() }
    }

    private func submit() {
        if ParentalGateView.lockedOutUntil != nil {
            lockedOut = true
            return
        }
        if Int(entry) == challenge.answer {
            close()
            onPass()
            return
        }
        attemptsLeft -= 1
        withAnimation(.spring(duration: 0.3)) { shake.toggle() }
        // A miss clears the slots and asks something new.
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(250))
            entry = ""
            challenge = ParentalGate.makeChallenge()
        }
        if attemptsLeft <= 0 {
            Self.startLockout()
            lockedOut = true
        }
    }
}

/// The gate over a screen instead of in a sheet (Welcome): a 45% Ink scrim
/// and, on iPad, a centred 440pt cream card with radius 28; on iPhone a
/// bottom sheet with a 32pt top radius and a grabber.
struct GateOverlay: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    let onPass: () -> Void
    let onClose: () -> Void

    var body: some View {
        ZStack(alignment: sizeClass == .regular ? .center : .bottom) {
            Theme.ink.opacity(0.45)
                .ignoresSafeArea()
                .onTapGesture { onClose() }
            if sizeClass == .regular {
                ParentalGateView(onPass: onPass, onClose: onClose)
                    .clipShape(RoundedRectangle(cornerRadius: 28))
                    .transition(.scale(scale: 0.96).combined(with: .opacity))
            } else {
                VStack(spacing: 0) {
                    Capsule().fill(Theme.ink.opacity(0.2)).frame(width: 40, height: 5).padding(.top, 10)
                    ParentalGateView(onPass: onPass, onClose: onClose)
                        .frame(maxWidth: .infinity)
                }
                .padding(.bottom, 24)
                .frame(maxWidth: .infinity)
                .background(Theme.cream, ignoresSafeAreaEdges: .bottom)
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: 32, topTrailingRadius: 32))
                .ignoresSafeArea(edges: .bottom)
                .transition(.move(edge: .bottom))
            }
        }
    }
}
