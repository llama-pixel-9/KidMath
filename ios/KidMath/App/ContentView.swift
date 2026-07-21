import AuthenticationServices
import SwiftUI

/// P0/P1 smoke screen: proves the JS engine runs inside the app and the data
/// layer round-trips. Lists the 22 modes from the bridge, generates/scores a
/// live question per mode, and shows auth + item-bank state.
/// Replaced by the real Home/Session UI in P2.
struct ContentView: View {
    @StateObject private var supabase = SupabaseService.shared
    @State private var engineInfo = "loading engine…"
    @State private var bankInfo = ""
    @State private var modes: [String] = []
    @State private var prompt = ""
    @State private var verdict = ""
    @State private var authMessage = ""
    @State private var bridge: EngineBridge?
    @State private var bankService: BankService?

    var body: some View {
        NavigationStack {
            List {
                Section("Engine") {
                    Text(engineInfo).font(.footnote).foregroundStyle(.secondary)
                    if !bankInfo.isEmpty {
                        Text(bankInfo).font(.footnote).foregroundStyle(.secondary)
                    }
                    if !prompt.isEmpty {
                        Text(prompt)
                        Text(verdict).foregroundStyle(verdict.hasPrefix("✓") ? .green : .red)
                    }
                }
                accountSection
                Section("Modes (tap to generate a question)") {
                    ForEach(modes, id: \.self) { mode in
                        Button(mode) { generate(mode: mode) }
                    }
                }
            }
            .navigationTitle("KidMath engine")
        }
        .task { startEngine() }
        .onOpenURL { url in supabase.handleAuthCallback(url) }
    }

    private var accountSection: some View {
        Section("Account") {
            if supabase.isSignedIn {
                Text("Signed in").foregroundStyle(.green)
                Button("Sign out") {
                    Task {
                        try? await supabase.signOut()
                        try? bankService?.reset()
                        refreshBankInfo()
                    }
                }
            } else {
                SignInWithAppleButton(.signIn) { request in
                    AppleSignInCoordinator.configure(request)
                } onCompletion: { result in
                    Task {
                        do {
                            try await AppleSignInCoordinator.complete(result, supabase: supabase)
                            await enrichBankAfterSignIn()
                        } catch {
                            authMessage = "Apple sign-in failed: \(error.localizedDescription)"
                        }
                    }
                }
                .frame(height: 44)
                Button("Sign in with Google") {
                    Task {
                        do {
                            try await supabase.signInWithGoogle()
                            await enrichBankAfterSignIn()
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

    private func startEngine() {
        do {
            let bridge = try EngineBridge()
            self.bridge = bridge
            self.bankService = BankService(engine: bridge)
            self.modes = try bridge.modes()
            self.engineInfo = "engine v\(bridge.version) · \(modes.count) modes · JavaScriptCore"
            refreshBankInfo()
        } catch {
            self.engineInfo = "engine failed: \(error)"
        }
    }

    private func refreshBankInfo() {
        guard let bridge else { return }
        let count = (try? bridge.bankCount()) ?? 0
        bankInfo = "item bank: \(count) items"
    }

    private func enrichBankAfterSignIn() async {
        guard let userId = supabase.userId else { return }
        await ProgressStore().mergeLocalToCloud(userId: userId)
        authMessage = ""
        refreshBankInfo()
    }

    private func generate(mode: String) {
        guard let bridge else { return }
        Task {
            // Cloud-enrich this mode first when signed in (seed still works offline).
            await bankService?.ensureModeLoaded(mode)
            refreshBankInfo()
            do {
                let question = try bridge.generateQuestion(mode: mode, level: 3)
                let display = question["display"] as? [String: Any]
                self.prompt = (display?["promptText"] as? String)
                    ?? (question["question"] as? String)
                    ?? "(visual question: \(question["type"] ?? "?"))"
                if var submission = question["answer"] {
                    // multiSelect answers may be a list of acceptable
                    // selections; submit one selection like the UI would.
                    if try bridge.questionAnswerType(question: question) == "multiSelect",
                       let alternatives = submission as? [[Any]], let first = alternatives.first {
                        submission = first
                    }
                    let correct = try bridge.checkAnswer(question: question, submitted: submission)
                    self.verdict = correct ? "✓ checkAnswer accepts its own answer" : "✗ checkAnswer rejected its own answer"
                }
            } catch {
                self.prompt = "generation failed"
                self.verdict = "✗ \(error)"
            }
        }
    }
}

#Preview {
    ContentView()
}
