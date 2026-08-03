import AuthenticationServices
import StoreKit
import SwiftUI

/// First flight (§20): value page → parent account (Apple/Google) → add a
/// kid → soft paywall. The account flow is plain English — bird voice stays
/// on kid-facing screens and the game names. One full-bleed teal panel per
/// screen, Sun reserved for the single paid action.
///
/// While the launch switch is off (`StoreService.paywallEnabled == false`)
/// the plan step is skipped entirely.
struct FirstFlightView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    enum Step {
        case value
        case account
        case kid
        case plan
    }

    @State private var step: Step = .value
    @State private var newKids: [KidProfile] = []

    static let completedKey = "kidmath-first-flight-done"

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if step == .kid || step == .plan {
                    wizardRail
                }
                switch step {
                case .value:
                    ValueStep(
                        onStart: { advancePastValue() },
                        onSkip: { finish(activateKid: nil) }
                    )
                case .account:
                    AccountStep(onSignedIn: { onSignedIn() })
                case .kid:
                    KidStep(onDone: { kids in onKidsAdded(kids) })
                case .plan:
                    PlanStep(
                        kidName: newKids.first?.firstName,
                        onDone: { finish(activateKid: newKids.count == 1 ? newKids.first : nil) }
                    )
                }
            }
            .frame(maxWidth: 720)
            .padding(.horizontal)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.cream)
        .task {
            // A signed-in parent never sees the account step again.
            if app.supabase.isSignedIn { step = .value }
        }
    }

    /// Three segments: account, kid, plan.
    private var wizardRail: some View {
        let position = step == .kid ? 2 : 3
        return HStack(spacing: 12) {
            Button("Back") {
                if step == .plan { step = .kid } else { step = .value }
            }
            .font(theme.bodyFont(size: 14, weight: .bold))
            .foregroundStyle(Theme.ink.opacity(0.6))
            HStack(spacing: 8) {
                ForEach(1...3, id: \.self) { segment in
                    Capsule()
                        .fill(segment <= position ? Theme.teal : Theme.teal.opacity(0.15))
                        .frame(height: 5)
                }
            }
            Text("\(position) / 3")
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.6))
        }
        .padding(.vertical, 14)
    }

    private func advancePastValue() {
        step = app.supabase.isSignedIn ? .kid : .account
    }

    private func onSignedIn() {
        Task {
            if let userId = app.supabase.userId {
                await app.progressStore.mergeLocalToCloud(userId: userId)
            }
            await app.kidProfiles.refresh()
            // Returning parents with kids skip straight out to the picker.
            if !app.kidProfiles.kids.isEmpty {
                finish(activateKid: nil)
            } else {
                step = .kid
            }
        }
    }

    private func onKidsAdded(_ kids: [KidProfile]) {
        newKids = kids
        if StoreService.paywallEnabled && !app.store.hasPremium {
            step = .plan
        } else {
            finish(activateKid: kids.count == 1 ? kids.first : nil)
        }
    }

    private func finish(activateKid kid: KidProfile?) {
        UserDefaults.standard.set(true, forKey: Self.completedKey)
        if let kid { app.kidProfiles.setActiveKid(kid) }
        dismiss()
    }
}

// MARK: - 01 · Value

private struct ValueStep: View {
    @Environment(\.theme) private var theme
    let onStart: () -> Void
    let onSkip: () -> Void

    var body: some View {
        let benefits: [(well: Color, icon: String, text: String)] = [
            (Theme.seafoam, "nosign", "No ads. Not one."),
            (Theme.tealMid, "checkmark.circle", "Wrong answers are never punished."),
            (Theme.apricot, "doc.text", "Print real worksheets."),
            (Theme.sunLight, "clock", "Built for fun and focus."),
        ]

        return VStack(alignment: .leading, spacing: 28) {
            HStack(spacing: 10) {
                LarkMarkView().frame(height: 30)
                Text("larkit")
                    .font(theme.displayFont(size: 30))
                    .foregroundStyle(Theme.teal)
            }
            .padding(.top, 16)

            Text("Math that\ntakes flight.")
                .font(theme.displayFont(size: 46))
                .foregroundStyle(Theme.ink)
                .lineSpacing(2)

            VStack(alignment: .leading, spacing: 18) {
                ForEach(benefits, id: \.text) { benefit in
                    HStack(spacing: 14) {
                        Image(systemName: benefit.icon)
                            .font(.system(size: 19, weight: .medium))
                            .foregroundStyle(Theme.ink)
                            .frame(width: 44, height: 44)
                            .background(RoundedRectangle(cornerRadius: 12).fill(benefit.well))
                        Text(benefit.text)
                            .font(theme.bodyFont(size: 17, weight: .bold))
                            .foregroundStyle(Theme.ink)
                    }
                }
            }

            PlayCardPanel()

            VStack(alignment: .leading, spacing: 14) {
                Button(action: onStart) {
                    Text("Get started")
                        .font(theme.displayFont(size: 20))
                        .foregroundStyle(Theme.cream)
                        .padding(.horizontal, 32)
                        .frame(height: 56)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Theme.teal)
                                .shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5)
                        )
                }
                .buttonStyle(SpringButtonStyle())

                Button("Already have an account? Sign in", action: onStart)
                    .font(theme.bodyFont(size: 16, weight: .bold))
                    .foregroundStyle(Theme.teal)

                Button("Skip for now", action: onSkip)
                    .font(theme.bodyFont(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.45))
            }
            .padding(.bottom, 8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - 02 · Parent account

private struct AccountStep: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    let onSignedIn: () -> Void
    @State private var authMessage = ""

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 60)
            Text("Create your parent account")
                .font(theme.displayFont(size: 30))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
            Text("You'll add your kids next. One account covers up to four.")
                .font(theme.bodyFont(size: 16, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.top, 8)

            VStack(spacing: 12) {
                SignInWithAppleButton(.continue) { request in
                    AppleSignInCoordinator.configure(request)
                } onCompletion: { result in
                    Task {
                        do {
                            try await AppleSignInCoordinator.complete(result, supabase: app.supabase)
                            onSignedIn()
                        } catch {
                            authMessage = "Apple sign-in failed: \(error.localizedDescription)"
                        }
                    }
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 54)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                Button {
                    Task {
                        do {
                            try await app.supabase.signInWithGoogle()
                            onSignedIn()
                        } catch {
                            authMessage = "Google sign-in failed: \(error.localizedDescription)"
                        }
                    }
                } label: {
                    Text("Continue with Google")
                        .font(theme.bodyFont(size: 17, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Theme.ink.opacity(0.15), lineWidth: 1.5)
                                )
                        )
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: 420)
            .padding(.top, 32)

            if !authMessage.isEmpty {
                Text(authMessage)
                    .font(theme.bodyFont(size: 13, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 12)
            }

            Text("By continuing you agree to the Terms and Privacy Policy. We never show ads and never sell data about your kids.")
                .font(theme.bodyFont(size: 13))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .multilineTextAlignment(.center)
                .frame(maxWidth: 420)
                .padding(.top, 20)

            Link("Privacy Policy", destination: AppLinks.privacyPolicy)
                .font(theme.bodyFont(size: 13, weight: .bold))
                .foregroundStyle(Theme.teal)
                .padding(.top, 6)

            Text("Already have an account? The same buttons sign you in.")
                .font(theme.bodyFont(size: 15, weight: .bold))
                .foregroundStyle(Theme.teal)
                .padding(.top, 24)
            Spacer(minLength: 40)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - 03 · Add a kid

struct KidStep: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    let onDone: ([KidProfile]) -> Void

    @State private var firstName = ""
    @State private var age: String?
    @State private var grade: String?
    @State private var added: [KidProfile] = []
    @State private var errorMessage = ""
    @State private var busy = false

    private var complete: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty && age != nil && grade != nil
    }

    private var hasRoom: Bool {
        app.kidProfiles.kids.count + added.count < KidProfilesService.maxKids
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Who's learning?")
                .font(theme.displayFont(size: 34))
                .foregroundStyle(Theme.ink)
                .padding(.top, 20)
            Text("First name only — that's all we store about your child.")
                .font(theme.bodyFont(size: 16, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .padding(.top, 6)

            if !added.isEmpty {
                Text("Added: \(added.map(\.firstName).joined(separator: ", "))")
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.teal)
                    .padding(.top, 14)
            }

            Text("First name")
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink)
                .padding(.top, 28)
            TextField("", text: $firstName)
                .font(theme.bodyFont(size: 18, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .padding(.horizontal, 16)
                .frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Theme.ink.opacity(0.15), lineWidth: 1.5)
                        )
                )
                .padding(.top, 8)

            segmentRail("Age", options: KidProfilesService.ages, selection: $age)
            segmentRail("Grade", options: KidProfilesService.grades, selection: $grade)

            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 14)
            }

            HStack {
                if hasRoom && complete {
                    Button("+ Add another kid") {
                        Task { _ = await save() }
                    }
                    .font(theme.bodyFont(size: 16, weight: .bold))
                    .foregroundStyle(Theme.teal)
                    .disabled(busy)
                }
                Spacer()
                Button {
                    Task { await handleContinue() }
                } label: {
                    Text("Continue")
                        .font(theme.displayFont(size: 20))
                        .foregroundStyle(Theme.cream)
                        .padding(.horizontal, 32)
                        .frame(height: 56)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Theme.teal)
                                .shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5)
                        )
                        .opacity(busy || (!complete && added.isEmpty) ? 0.4 : 1)
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(busy || (!complete && added.isEmpty))
            }
            .padding(.top, 36)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func segmentRail(_ title: String, options: [String], selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink)
            let columns = [GridItem(.adaptive(minimum: 58, maximum: 120), spacing: 8)]
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(options, id: \.self) { option in
                    let isSelected = selection.wrappedValue == option
                    Button {
                        selection.wrappedValue = option
                    } label: {
                        Text(option)
                            .font(theme.bodyFont(size: 16, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    // Seafoam marks the selection (§20).
                                    .fill(isSelected ? Theme.seafoam : .white)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(
                                                isSelected ? Theme.teal : Theme.ink.opacity(0.1),
                                                lineWidth: 1.5
                                            )
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.top, 22)
    }

    private func save() async -> KidProfile? {
        guard let age, let grade else { return nil }
        busy = true
        defer { busy = false }
        do {
            let kid = try await app.kidProfiles.addKid(firstName: firstName, age: age, grade: grade)
            added.append(kid)
            firstName = ""
            self.age = nil
            self.grade = nil
            errorMessage = ""
            return kid
        } catch {
            errorMessage = "Could not save — \(error.localizedDescription)"
            return nil
        }
    }

    private func handleContinue() async {
        if complete {
            guard await save() != nil else { return }
        }
        guard !added.isEmpty else {
            errorMessage = "Add a first name, age and grade to continue."
            return
        }
        onDone(added)
    }
}

// MARK: - 04 · Soft paywall

private struct PlanStep: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    let kidName: String?
    let onDone: () -> Void

    @State private var purchasing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Unlock everything\(kidName.map { " for \($0)" } ?? "").")
                .font(theme.displayFont(size: 32))
                .foregroundStyle(Theme.ink)
                .padding(.top, 20)
            Text("\(kidName ?? "Your kid") is set up and ready. Choose how far the learning goes — you can change it any time.")
                .font(theme.bodyFont(size: 16, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .padding(.top, 8)

            VStack(spacing: 16) {
                freeCard
                plusCard
            }
            .padding(.top, 28)

            if !app.store.lastError.isEmpty {
                Text(app.store.lastError)
                    .font(theme.bodyFont(size: 13, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 12)
            }

            Text("Cancel anytime in the App Store's Subscriptions settings. The free plan is free forever.")
                .font(theme.bodyFont(size: 13))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
                .padding(.top, 20)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .onChange(of: app.store.hasPremium) {
            if app.store.hasPremium { onDone() }
        }
    }

    /// Free is a real plan, and its button carries full weight.
    private var freeCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Free")
                .font(theme.displayFont(size: 22))
                .foregroundStyle(Theme.ink)
            Text("$0")
                .font(theme.displayFont(size: 34))
                .foregroundStyle(Theme.ink)
            bullet("5 games — addition, subtraction, multiplication, division, counting")
            bullet("On iPad, iPhone, and the web")
            Button(action: onDone) {
                Text("Stay on the free plan")
                    .font(theme.displayFont(size: 18))
                    .foregroundStyle(Theme.teal)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Theme.teal, lineWidth: 2)
                    )
            }
            .buttonStyle(.plain)
            .padding(.top, 10)
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Theme.ink.opacity(0.1), lineWidth: 1.5)
                )
        )
    }

    /// Sun is reserved for the single paid action — Ink on Sun, never Cream.
    private var plusCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("larkit Plus")
                .font(theme.displayFont(size: 22))
                .foregroundStyle(Theme.ink)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(app.store.annual?.displayPrice ?? "$54.99")
                    .font(theme.displayFont(size: 34))
                    .foregroundStyle(Theme.ink)
                Text("/ year · or \(app.store.monthly?.displayPrice ?? "$8.99") monthly")
                    .font(theme.bodyFont(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.7))
            }
            bullet("All 22 games on iPad, iPhone, and the web")
            bullet("Every kid in your household — one price")
            bullet("Flight logs — printable worksheets for any game, with answer keys")
            bullet("Progress syncs across devices")
            VStack(spacing: 8) {
                Button {
                    purchase(app.store.annual)
                } label: {
                    Text("Start the free trial")
                        .font(theme.displayFont(size: 18))
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Theme.sun)
                                .shadow(color: Theme.ember, radius: 0, x: 0, y: 5)
                        )
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(purchasing || app.store.annual == nil)

                Button("or \(app.store.monthly?.displayPrice ?? "$8.99")/month") {
                    purchase(app.store.monthly)
                }
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.7))
                .disabled(purchasing || app.store.monthly == nil)
            }
            .padding(.top, 10)
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20).fill(Theme.seafoam))
        .overlay(alignment: .topTrailing) {
            Text("14 days free")
                .font(theme.bodyFont(size: 12, weight: .bold))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 5)
                .background(Capsule().fill(Theme.sun))
                .offset(x: -18, y: -12)
        }
    }

    private func bullet(_ text: String) -> some View {
        Text(text)
            .font(theme.bodyFont(size: 15, weight: .semibold))
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
    }

    private func purchase(_ product: Product?) {
        guard let product else { return }
        Task {
            purchasing = true
            await app.store.purchase(product)
            purchasing = false
        }
    }
}
