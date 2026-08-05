import SwiftUI

/// Parental gate — required by App Store review for Kids-category apps
/// before any purchase flow or external link. The challenge is an adult
/// task: arithmetic with the operands SPELLED OUT, so pre-readers can't
/// pattern-match digits into the pad.
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

struct ParentalGateView: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    /// Runs after the gate is passed (the sheet dismisses itself first).
    let onPass: () -> Void

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
        VStack(spacing: 18) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 40))
                .foregroundStyle(theme.textSecondary)
            Text("Ask a grown-up")
                .font(.title2.weight(.heavy))
                .fontDesign(.rounded)
                .foregroundStyle(theme.textPrimary)

            if lockedOut {
                Text("Too many tries. The lock opens again in a minute — ask a grown-up to come back then.")
                    .font(.headline)
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 24)
            } else {
                Text(challenge.question)
                    .font(.headline)
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .offset(x: shake ? -8 : 0)

                EntryReadout(entry: entry)
                DigitPadView(entry: $entry, maxLength: 3) {
                    submit()
                }
            }

            Button("Cancel") { dismiss() }
                .foregroundStyle(theme.textMuted)
        }
        .padding(24)
        .frame(maxWidth: 420)
        .presentationDetents([.large])
        .background(theme.background)
        .onAppear {
            lockedOut = ParentalGateView.lockedOutUntil != nil
        }
    }

    private func submit() {
        if ParentalGateView.lockedOutUntil != nil {
            lockedOut = true
            return
        }
        if Int(entry) == challenge.answer {
            dismiss()
            onPass()
            return
        }
        attemptsLeft -= 1
        entry = ""
        challenge = ParentalGate.makeChallenge()
        withAnimation(.spring(duration: 0.3)) { shake.toggle() }
        if attemptsLeft <= 0 {
            Self.startLockout()
            lockedOut = true
        }
    }
}
