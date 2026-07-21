import AuthenticationServices
import SwiftUI

/// Settings: account (sign in/out) + engine diagnostics. Theme picker,
/// sound, and low-motion settings arrive in P3 with their features.
struct SettingsView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var authMessage = ""
    /// Kids category: account actions (which open sign-in flows) sit behind
    /// the parental gate, like purchases.
    @State private var accountUnlocked = false
    @State private var showGate = false

    var body: some View {
        NavigationStack {
            List {
                subscriptionSection
                themeSection
                soundSection
                accountSection
                engineSection
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var subscriptionSection: some View {
        Section("Subscription") {
            if app.store.hasPremium {
                Label("KidMath Premium is active", systemImage: "star.circle.fill")
                    .foregroundStyle(.green)
                Text("Manage or cancel in the App Store's Subscriptions settings.")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
            } else {
                Text("Free trial available — all 22 modes, worksheets, and sync.")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
                Button("Restore purchases") {
                    Task { await app.store.restorePurchases() }
                }
            }
        }
    }

    private var themeSection: some View {
        Section("Theme") {
            ForEach(Theme.all) { option in
                Button {
                    app.themeId = option.id
                } label: {
                    HStack(spacing: 12) {
                        Text(option.emoji).font(.title2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(option.label)
                                .font(.headline)
                                .foregroundStyle(.primary)
                            Text(option.themeDescription)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if app.themeId == option.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var soundSection: some View {
        Section("Sound") {
            Toggle("Sound effects", isOn: Binding(
                get: { !app.isMuted },
                set: { app.isMuted = !$0 }
            ))
        }
    }

    private var accountSection: some View {
        Section("Account") {
            if app.supabase.isSignedIn {
                Label("Signed in — progress syncs across devices", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Button("Sign out", role: .destructive) {
                    Task {
                        try? await app.supabase.signOut()
                        try? app.bankService?.reset()
                    }
                }
            } else if !accountUnlocked {
                Text("Sign in to save stars and progress across devices.")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
                Button {
                    showGate = true
                } label: {
                    Label("Parents: sign in", systemImage: "lock.shield")
                }
            } else {
                SignInWithAppleButton(.signIn) { request in
                    AppleSignInCoordinator.configure(request)
                } onCompletion: { result in
                    Task {
                        do {
                            try await AppleSignInCoordinator.complete(result, supabase: app.supabase)
                            await afterSignIn()
                        } catch {
                            authMessage = "Apple sign-in failed: \(error.localizedDescription)"
                        }
                    }
                }
                .frame(height: 44)
                Button("Sign in with Google") {
                    Task {
                        do {
                            try await app.supabase.signInWithGoogle()
                            await afterSignIn()
                        } catch {
                            authMessage = "Google sign-in failed: \(error.localizedDescription)"
                        }
                    }
                }
            }
            if !authMessage.isEmpty {
                Text(authMessage).font(.footnote).foregroundStyle(.red)
            }
        }
        .sheet(isPresented: $showGate) {
            ParentalGateView { accountUnlocked = true }
        }
    }

    private var engineSection: some View {
        Section("Engine") {
            if let engine = app.engine {
                Text("engine v\(engine.version) · \((try? engine.modes().count) ?? 0) modes · JavaScriptCore")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
                Text("item bank: \((try? engine.bankCount()) ?? 0) items")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
            } else {
                Text("engine failed: \(app.engineError ?? "unknown")")
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }

    private func afterSignIn() async {
        authMessage = ""
        if let userId = app.supabase.userId {
            await app.progressStore.mergeLocalToCloud(userId: userId)
        }
        await app.refreshModeLevels()
    }
}
