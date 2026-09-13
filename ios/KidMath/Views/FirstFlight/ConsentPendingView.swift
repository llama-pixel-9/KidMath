import SwiftUI

/// "Check your email" — the parent has typed a child's details and the direct
/// notice has gone out; nothing is stored until they tap the link. Port of
/// ConsentPendingPanel in src/onboarding/OnboardingFlow.jsx: sent-at stamp,
/// 60-second resend cooldown (each email supersedes the last), and an
/// "I've confirmed" check that looks for the server-created profile.
struct ConsentPendingView: View {
    @Environment(\.theme) private var theme
    @Environment(\.openURL) private var openURL

    let pending: KidProfilesService.PendingConsent
    let email: String
    let onResend: () async throws -> KidProfilesService.PendingConsent
    let onConfirmed: (KidProfile) -> Void
    let checkConfirmed: () async -> KidProfile?

    @State private var lastSentAt: Date
    @State private var resendState: ResendState = .idle
    @State private var cooldown: Int
    @State private var busy = false
    @State private var error = ""
    @State private var showGate = false

    enum ResendState { case idle, sending, sent, failed(String) }

    init(pending: KidProfilesService.PendingConsent, email: String,
         onResend: @escaping () async throws -> KidProfilesService.PendingConsent,
         onConfirmed: @escaping (KidProfile) -> Void,
         checkConfirmed: @escaping () async -> KidProfile?) {
        self.pending = pending
        self.email = email
        self.onResend = onResend
        self.onConfirmed = onConfirmed
        self.checkConfirmed = checkConfirmed
        _lastSentAt = State(initialValue: pending.sentAt)
        _cooldown = State(initialValue: Self.cooldownLeft(since: pending.sentAt))
    }

    static func cooldownLeft(since date: Date, now: Date = Date()) -> Int {
        max(0, KidProfilesService.resendCooldownSeconds - Int(now.timeIntervalSince(date)))
    }

    private var sentAtText: String {
        lastSentAt.formatted(date: .omitted, time: .shortened)
    }

    private var resendLabel: String {
        if case .sending = resendState { return "Sending…" }
        return cooldown > 0 ? "Resend in \(cooldown)s" : "Resend the email"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Check your email")
                .font(theme.displayFont(size: 34))
                .foregroundStyle(Theme.ink)
                .padding(.top, 20)

            Group {
                if case .sent = resendState {
                    Text("Sent again to **\(email)** at \(sentAtText). Only the link in this newest email works — earlier ones are cancelled.")
                } else {
                    Text("We sent the parental consent notice to **\(email)** at \(sentAtText).")
                }
            }
            .font(theme.bodyFont(size: 16, weight: .semibold))
            .foregroundStyle(Theme.ink.opacity(0.7))
            .padding(.top, 12)
            .accessibilityAddTraits(.updatesFrequently)

            Text("Because larkit is made for kids, the law asks us to get your consent before we create \(pending.firstName)'s profile — one tap on the link in that email does it.")
                .font(theme.bodyFont(size: 16, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.7))
                .padding(.top, 12)

            Text("Until you confirm, nothing about \(pending.firstName) is stored in a profile. If you do nothing, we delete what you typed within 14 days.")
                .font(theme.bodyFont(size: 14, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .padding(.top, 12)

            Button("Read the notice") { showGate = true }
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.teal)
                .padding(.top, 6)

            if !error.isEmpty {
                Text(error)
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 14)
            }
            if case .failed(let message) = resendState {
                Text(message)
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 14)
            }

            VStack(alignment: .leading, spacing: 12) {
                Button {
                    Task { await confirm() }
                } label: {
                    Text("I've confirmed — continue")
                        .font(theme.displayFont(size: 20))
                        .foregroundStyle(Theme.cream)
                        .padding(.horizontal, 28)
                        .frame(height: 56)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Theme.teal)
                                .shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5)
                        )
                        .opacity(busy ? 0.4 : 1)
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(busy)

                Button {
                    Task { await resend() }
                } label: {
                    Text(resendLabel)
                        .font(theme.bodyFont(size: 16, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 22)
                        .frame(height: 56)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(.white)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink.opacity(0.15), lineWidth: 1.5))
                        )
                        .opacity(resendDisabled ? 0.5 : 1)
                }
                .buttonStyle(.plain)
                .disabled(resendDisabled)
                .accessibilityHint(cooldown > 0 ? "Available in \(cooldown) seconds" : "")
            }
            .padding(.top, 32)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .task(id: lastSentAt) {
            // Countdown from the most recent send.
            while !Task.isCancelled {
                cooldown = Self.cooldownLeft(since: lastSentAt)
                if cooldown == 0 { break }
                try? await Task.sleep(for: .seconds(1))
            }
        }
        .sheet(isPresented: $showGate) {
            // Kids category: external links sit behind the parental gate.
            ParentalGateView {
                showGate = false
                openURL(AppLinks.parentalConsent)
            }
        }
    }

    private var resendDisabled: Bool {
        if busy || cooldown > 0 { return true }
        if case .sending = resendState { return true }
        return false
    }

    private func resend() async {
        guard !resendDisabled else { return }
        resendState = .sending
        do {
            let next = try await onResend()
            lastSentAt = next.sentAt
            resendState = .sent
        } catch {
            resendState = .failed(error.localizedDescription.isEmpty ? "Could not send the email — try again." : error.localizedDescription)
        }
    }

    private func confirm() async {
        busy = true
        error = ""
        defer { busy = false }
        if let kid = await checkConfirmed() {
            onConfirmed(kid)
        } else {
            error = "We haven't received your confirmation yet — tap the link in the email first."
        }
    }
}
