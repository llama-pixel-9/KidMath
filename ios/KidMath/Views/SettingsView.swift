import AuthenticationServices
import SwiftUI

/// Settings: account (sign in/out) + engine diagnostics. Theme picker,
/// sound, and low-motion settings arrive in P3 with their features.
struct SettingsView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @State private var authMessage = ""

    var body: some View {
        NavigationStack {
            List {
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
            } else {
                Text("Sign in to save stars and progress across devices.")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
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
