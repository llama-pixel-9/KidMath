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
    @State private var gatePendingAction: (() -> Void)?
    @State private var kidToDelete: KidProfile?
    @State private var kidToEdit: KidProfile?
    @State private var showProfilePicker = false
    @State private var confirmAccountDelete = false
    @State private var deletionMessage = ""
    @State private var deleting = false

    var body: some View {
        NavigationStack {
            List {
                grownUpsSection
                subscriptionSection
                soundSection
                accountSection
                if app.supabase.isSignedIn {
                    dataSection
                }
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

    /// The parent report — same practice log and model as larkit.io/report.
    private var grownUpsSection: some View {
        Section("For grown-ups") {
            NavigationLink {
                ParentReportView()
            } label: {
                Label("Progress report", systemImage: "chart.bar.doc.horizontal")
            }
        }
    }

    private var subscriptionSection: some View {
        Section("Subscription") {
            if app.store.hasPremium {
                Label("larkit Premium is active", systemImage: "star.circle.fill")
                    .foregroundStyle(Theme.teal)
                Text("Manage or cancel in the App Store's Subscriptions settings.")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
            } else {
                Text("Free trial available — all 25 games, K–5, flight logs, and sync.")
                    .font(.footnote)
                    .foregroundStyle(theme.textSecondary)
                Button("Restore purchases") {
                    // Kids category: restore is a purchase-adjacent action —
                    // gated, same as PaywallView's restore.
                    guardGate {
                        Task { await app.store.restorePurchases() }
                    }
                }
            }
        }
    }


    private var soundSection: some View {
        Section("Sound & Motion") {
            Toggle("Sound effects", isOn: Binding(
                get: { !app.isMuted },
                set: { app.isMuted = !$0 }
            ))
            Toggle(isOn: $app.calmMode) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Calm mode")
                    Text("No confetti or shaking — stars and levels stay.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
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
                        // Kid profiles belong to the account that just left.
                        app.kidProfiles.setActiveKid(nil)
                        await app.kidProfiles.refresh()
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
            ParentalGateView {
                accountUnlocked = true
                gatePendingAction?()
                gatePendingAction = nil
            }
        }
    }

    /// The §312.6 surface: review is the kid list itself (first name, age,
    /// grade — that's everything we store per child); per-child deletion is
    /// the "refuse further collection" right; account deletion is Apple
    /// 5.1.1(v). Destructive actions sit behind the parental gate.
    private var dataSection: some View {
        Section {
            ForEach(app.kidProfiles.kids) { kid in
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(kid.firstName)
                        if app.kidProfiles.activeKidId == kid.id.uuidString {
                            Text("playing now").font(.caption.weight(.bold)).foregroundStyle(Theme.teal)
                        }
                    }
                    Text("Age \(kid.age) · Grade \(kid.grade) — all we store about them")
                        .font(.footnote)
                        .foregroundStyle(theme.textSecondary)
                    HStack(spacing: 16) {
                        // Grade changes every September: routine maintenance
                        // under the existing consent, not new collection.
                        Button("Edit") { kidToEdit = kid }
                            .font(.footnote.weight(.semibold))
                        Button("Delete \(kid.firstName)'s profile", role: .destructive) {
                            guardGate { kidToDelete = kid }
                        }
                        .font(.footnote.weight(.semibold))
                        .disabled(deleting)
                    }
                }
            }
            if app.kidProfiles.kids.count > 1 {
                Button("Switch who's playing") { showProfilePicker = true }
            }
            Button("Delete my account and all data", role: .destructive) {
                guardGate { confirmAccountDelete = true }
            }
            .disabled(deleting)
            if !deletionMessage.isEmpty {
                Text(deletionMessage).font(.footnote).foregroundStyle(.red)
            }
        } header: {
            Text("Your data")
        } footer: {
            Text("Deletion is permanent: profiles and practice progress are removed from our servers, not archived. Progress syncs at the family level; deleting the account removes all of it.")
        }
        .sheet(item: $kidToEdit) { kid in
            KidEditSheet(kid: kid)
        }
        .fullScreenCover(isPresented: $showProfilePicker) { ProfilePickerView() }
        .confirmationDialog(
            "Delete \(kidToDelete?.firstName ?? "this kid")'s profile?",
            isPresented: Binding(get: { kidToDelete != nil }, set: { if !$0 { kidToDelete = nil } }),
            titleVisibility: .visible,
            presenting: kidToDelete
        ) { kid in
            Button("Delete profile — cannot be undone", role: .destructive) {
                deleteKid(kid)
            }
        } message: { kid in
            Text("\(kid.firstName)'s profile will be deleted and nothing more will be collected about them.")
        }
        .confirmationDialog(
            "Delete your account and all data?",
            isPresented: $confirmAccountDelete,
            titleVisibility: .visible
        ) {
            Button("Delete everything — cannot be undone", role: .destructive) {
                deleteWholeAccount()
            }
        } message: {
            Text("Every child profile, all progress, and your sign-in are permanently deleted from our servers and this device.")
        }
    }

    /// Destructive account actions require the parental gate first.
    private func guardGate(_ action: @escaping () -> Void) {
        if accountUnlocked {
            action()
        } else {
            gatePendingAction = action
            showGate = true
        }
    }

    private func deleteKid(_ kid: KidProfile) {
        Task {
            deleting = true
            defer { deleting = false }
            do {
                try await app.supabase.deleteKidProfile(kidId: kid.id)
                if app.kidProfiles.activeKidId == kid.id.uuidString {
                    app.kidProfiles.setActiveKid(nil)
                }
                await app.kidProfiles.refresh()
                deletionMessage = ""
            } catch {
                deletionMessage = "Could not delete — \(error.localizedDescription)"
            }
        }
    }

    private func deleteWholeAccount() {
        Task {
            deleting = true
            defer { deleting = false }
            do {
                try await app.supabase.deleteAccount()
                try? app.bankService?.reset()
                app.kidProfiles.setActiveKid(nil)
                await app.kidProfiles.refresh()
                await app.refreshModeLevels()
                deletionMessage = ""
                dismiss()
            } catch {
                deletionMessage = "Could not delete the account — \(error.localizedDescription)"
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


/// Edit a kid's first name, age and grade — the same three fields the
/// consent covers (web: AccountPage KidEditForm → updateKid).
struct KidEditSheet: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    let kid: KidProfile

    @State private var firstName: String
    @State private var age: String
    @State private var grade: String
    @State private var busy = false
    @State private var error = ""

    init(kid: KidProfile) {
        self.kid = kid
        _firstName = State(initialValue: kid.firstName)
        _age = State(initialValue: kid.age)
        _grade = State(initialValue: kid.grade)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("First name") {
                    TextField("First name", text: $firstName)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.words)
                }
                Section("Age") {
                    Picker("Age", selection: $age) {
                        ForEach(KidProfilesService.ages, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                Section("Grade") {
                    Picker("Grade", selection: $grade) {
                        ForEach(KidProfilesService.grades, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                if !error.isEmpty {
                    Text(error).font(.footnote).foregroundStyle(.red)
                }
            }
            .navigationTitle("Edit \(kid.firstName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(busy || firstName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() async {
        busy = true
        defer { busy = false }
        do {
            _ = try await app.kidProfiles.updateKid(kid, firstName: firstName, age: age, grade: grade)
            await app.refreshModeLevels()
            dismiss()
        } catch {
            self.error = "Could not save — \(error.localizedDescription)"
        }
    }
}
