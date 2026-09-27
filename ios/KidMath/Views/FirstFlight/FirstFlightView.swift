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
    @Environment(\.horizontalSizeClass) private var sizeClass

    enum Step {
        case value
        case account
        case kid
        case plan
    }

    @State private var step: Step = .value
    @State private var newKids: [KidProfile] = []

    static let completedKey = "kidmath-first-flight-done"

    /// The grown-up check over Welcome (handoff 2a · 02): both "Get started"
    /// and "I have an account" go through it; a pass runs `gatedAction`.
    @State private var showGate = false
    @State private var gatedAction: (() -> Void)?

    var body: some View {
        GeometryReader { proxy in
        ZStack {
            if step == .value {
                WelcomeStep(
                    onStart: { gate { advancePastValue() } },
                    onHaveAccount: { gate { advancePastValue() } }
                )
            } else {
                HStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 0) {
                        if step == .account || step == .kid {
                            wizardRail
                        }
                        switch step {
                        case .value:
                            EmptyView()
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
                    .padding(.horizontal, sizeClass == .regular ? 64 : 24)
                    .padding(.bottom, 32)
                    // The account step fills the height so its note sits at the bottom.
                    .frame(maxWidth: .infinity, minHeight: step == .account ? proxy.size.height : 0)
                }
                .background(GraphPaperBackground())
                // 2a · 03: the Seafoam "What we keep" panel beside the account step.
                if step == .account && sizeClass == .regular {
                    WhatWeKeepPanel().ignoresSafeArea()
                }
                }
            }

            if showGate {
                GateOverlay(
                    onPass: {
                        withAnimation(.easeOut(duration: 0.2)) { showGate = false }
                        gatedAction?()
                        gatedAction = nil
                    },
                    onClose: {
                        withAnimation(.easeOut(duration: 0.2)) { showGate = false }
                        gatedAction = nil
                    }
                )
                .zIndex(1)
            }
        }
        }
        .task {
            // A signed-in parent never sees the account step again.
            if app.supabase.isSignedIn { step = .value }
            // Dev hook: `-firstFlightStep gate|account|kid` lands on that screen
            // (screenshots, quick manual checks).
            switch UserDefaults.standard.string(forKey: "firstFlightStep") {
            case "gate": showGate = true
            case "account": step = .account
            case "kid": step = .kid
            default: break
            }
        }
    }

    private func gate(_ action: @escaping () -> Void) {
        gatedAction = action
        withAnimation(.easeOut(duration: 0.2)) { showGate = true }
    }

    /// Two segments: parent account (1/2), who's learning (2/2).
    private var wizardRail: some View {
        let position = step == .account ? 1 : 2
        return HStack(spacing: 16) {
            Button("Back") {
                step = step == .kid ? .account : .value
            }
            .font(theme.bodyFont(size: 17, weight: .bold))
            .foregroundStyle(Theme.ink.opacity(0.7))
            HStack(spacing: 8) {
                ForEach(1...2, id: \.self) { segment in
                    Capsule()
                        .fill(segment <= position ? Theme.teal : Theme.teal.opacity(0.15))
                        .frame(height: 6)
                }
            }
            Text("\(position) / 2")
                .font(.system(size: 15, weight: .medium, design: .monospaced))
                .foregroundStyle(Theme.ink.opacity(0.6))
        }
        .padding(.top, 36)
        .padding(.bottom, 14)
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
            // Returning parents: one kid flies straight in, more go to the
            // picker (Home presents it); no kids yet → add one.
            let kids = app.kidProfiles.kids
            if kids.count == 1 {
                finish(activateKid: kids[0])
            } else if kids.count > 1 {
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

// MARK: - 01 · Welcome (handoff 2a)

/// Landscape iPad: two columns — the pitch on graph paper, a 520pt Lark Teal
/// panel with the "Try one" card. Portrait iPad and iPhone: the teal panel on
/// top (500pt / 330pt), the pitch and CTA below.
private struct WelcomeStep: View {
    @Environment(\.theme) private var theme
    @Environment(\.horizontalSizeClass) private var sizeClass
    let onStart: () -> Void
    let onHaveAccount: () -> Void

    private let bullets = ["No ads. Not one.", "Wrong answers are never punished.", "Print real worksheets."]

    var body: some View {
        GeometryReader { proxy in
            let landscape = sizeClass == .regular && proxy.size.width > proxy.size.height
            let phone = sizeClass == .compact
            if landscape {
                HStack(spacing: 0) {
                    pitch(phone: false)
                        .padding(.vertical, 56)
                        .padding(.horizontal, 64)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                        .background(GraphPaperBackground())
                    tealPanel(phone: false)
                        .frame(width: 520)
                        .frame(maxHeight: .infinity)
                }
                .ignoresSafeArea()
            } else {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        tealPanel(phone: phone, topInset: proxy.safeAreaInsets.top)
                            .frame(height: (phone ? 330 : 500) + proxy.safeAreaInsets.top)
                        pitch(phone: phone)
                            .padding(.top, phone ? 28 : 48)
                            .padding(.horizontal, phone ? 24 : 64)
                            .padding(.bottom, 32)
                            .frame(maxWidth: .infinity, minHeight: proxy.size.height - (phone ? 330 : 500), alignment: .leading)
                    }
                }
                .background(GraphPaperBackground())
                .ignoresSafeArea(edges: .top)
            }
        }
    }

    private func pitch(phone: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                LarkMarkView().frame(width: 40, height: 34)
                Text("larkit")
                    .font(theme.displayFont(size: 28))
                    .foregroundStyle(Theme.teal)
            }
            if !phone { Spacer(minLength: 24) }
            Text("Math that takes flight.")
                .font(theme.displayFont(size: phone ? 40 : 68))
                .lineSpacing(phone ? 0 : 1)
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, phone ? 18 : 0)
            VStack(alignment: .leading, spacing: 14) {
                ForEach(bullets, id: \.self) { line in
                    HStack(alignment: .center, spacing: 14) {
                        Circle().fill(Theme.teal).frame(width: 10, height: 10)
                        Text(line)
                            .font(theme.bodyFont(size: phone ? 18 : 21, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                    }
                }
            }
            .padding(.top, phone ? 20 : 28)
            Spacer(minLength: phone ? 40 : 32)
            if phone {
                VStack(spacing: 14) {
                    primary(fullWidth: true)
                    Button("I have an account", action: onHaveAccount)
                        .font(theme.bodyFont(size: 18, weight: .bold))
                        .foregroundStyle(Theme.teal)
                }
            } else {
                HStack(spacing: 28) {
                    primary(fullWidth: false)
                    Button("I have an account", action: onHaveAccount)
                        .font(theme.bodyFont(size: 18, weight: .bold))
                        .foregroundStyle(Theme.teal)
                }
            }
        }
    }

    private func primary(fullWidth: Bool) -> some View {
        Button(action: onStart) {
            Text("Get started")
                .font(theme.displayFont(size: 20))
                .foregroundStyle(Theme.cream)
                .padding(.horizontal, fullWidth ? 0 : 52)
                .frame(maxWidth: fullWidth ? .infinity : nil)
                .frame(height: fullWidth ? 56 : 64)
                .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal).shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5))
        }
        .buttonStyle(SpringButtonStyle())
    }

    private func tealPanel(phone: Bool, topInset: CGFloat = 0) -> some View {
        ZStack {
            Theme.teal
            WelcomeDemoCard(compact: phone)
                .frame(maxWidth: phone ? .infinity : 420)
                .padding(.horizontal, phone ? 20 : 50)
                // The card lives below the status bar, not under it.
                .padding(.top, topInset)
        }
    }
}

// MARK: - 02 · Parent account

private struct AccountStep: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.openURL) private var openURL
    let onSignedIn: () -> Void
    @State private var authMessage = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer(minLength: sizeClass == .regular ? 120 : 60)
            Text("Create your parent account")
                .font(theme.displayFont(size: sizeClass == .regular ? 42 : 36))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("You'll add your kids next. One account covers up to four.")
                .font(theme.bodyFont(size: 18, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 12)

            VStack(spacing: 14) {
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
                .frame(height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 16))

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
                    HStack(spacing: 12) {
                        GoogleGMark().frame(width: 20, height: 20)
                        Text("Continue with Google")
                            .font(theme.bodyFont(size: 18, weight: .bold))
                            .foregroundStyle(Theme.ink)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 64)
                    .background(RoundedRectangle(cornerRadius: 16).fill(.white))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink.opacity(0.12), lineWidth: 1.5))
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: 520)
            .padding(.top, 32)

            if !authMessage.isEmpty {
                Text(authMessage)
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 12)
            }

            legal
                .padding(.top, 24)
                .frame(maxWidth: 520, alignment: .leading)

            if sizeClass != .regular {
                Spacer(minLength: 40)
                keepNote
            }
            Spacer(minLength: 40)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The gate was passed on Welcome, so the legal links open directly.
    private var legal: some View {
        var text = AttributedString("By continuing you agree to the ")
        var terms = AttributedString("Terms"); terms.link = AppLinks.terms; terms.foregroundColor = Theme.teal; terms.underlineStyle = .single
        var and = AttributedString(" and ")
        var privacy = AttributedString("Privacy Policy"); privacy.link = AppLinks.privacyPolicy; privacy.foregroundColor = Theme.teal; privacy.underlineStyle = .single
        var tail = AttributedString(". Already have an account? The same buttons sign you in.")
        text.foregroundColor = Theme.ink.opacity(0.7); and.foregroundColor = Theme.ink.opacity(0.7); tail.foregroundColor = Theme.ink.opacity(0.7)
        return Text(text + terms + and + privacy + tail)
            .font(theme.bodyFont(size: 14, weight: .semibold))
            .fixedSize(horizontal: false, vertical: true)
    }

    /// iPhone: the Seafoam "What we keep" note at the bottom of the column
    /// (on iPad it is the right panel, drawn by FirstFlightView).
    private var keepNote: some View {
        (Text("What we keep: ").font(theme.bodyFont(size: 17, weight: .bold)) + Text("your email, and each kid's first name and grade. Nothing else.").font(theme.bodyFont(size: 17, weight: .semibold)))
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 20).fill(Theme.seafoam))
    }
}

/// The Seafoam side panel beside the parent-account step on iPad (2a · 03).
struct WhatWeKeepPanel: View {
    @Environment(\.theme) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Spacer()
            Text("What we keep")
                .font(theme.displayFont(size: 30))
                .foregroundStyle(Theme.ink)
            Text("Your email, and each kid's first name and grade. Nothing else. We never show ads and never sell data about your kids.")
                .font(theme.bodyFont(size: 17, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(48)
        .frame(width: 420)
        .frame(maxHeight: .infinity, alignment: .bottomLeading)
        .background(Theme.seafoam)
    }
}

/// Google's four-colour "G", drawn — the SDK ships no SwiftUI asset.
struct GoogleGMark: View {
    var body: some View {
        Canvas { context, size in
            let r = min(size.width, size.height) / 2
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let w = r * 0.42
            func arc(_ from: Double, _ to: Double, _ color: Color) {
                var p = Path()
                p.addArc(center: c, radius: r - w / 2, startAngle: .degrees(from), endAngle: .degrees(to), clockwise: false)
                context.stroke(p, with: .color(color), style: StrokeStyle(lineWidth: w, lineCap: .butt))
            }
            // Screen-space degrees, clockwise from +x; the opening is top-right.
            arc(225, 315, Color(red: 0.92, green: 0.26, blue: 0.21))   // red: top
            arc(135, 225, Color(red: 0.98, green: 0.74, blue: 0.02))   // yellow: left
            arc(45, 135, Color(red: 0.20, green: 0.66, blue: 0.33))    // green: bottom
            arc(0, 45, Color(red: 0.26, green: 0.52, blue: 0.96))      // blue: right
            var bar = Path()
            bar.addRect(CGRect(x: c.x - 2, y: c.y - w / 2, width: r + 2 - 0.5, height: w))
            context.fill(bar, with: .color(Color(red: 0.26, green: 0.52, blue: 0.96)))
        }
        .accessibilityHidden(true)
    }
}

// MARK: - 03 · Who's learning (handoff 2a · 04)

/// First name, their colour, age, grade — the fields the consent notice
/// lists. The CTA reads "Start {name}'s first flight" and is disabled until
/// name, age and grade are set. Also hosts the consent-pending screen when
/// the household has no consent on file yet.
struct KidStep: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.horizontalSizeClass) private var sizeClass
    let onDone: ([KidProfile]) -> Void

    @State private var firstName = ""
    @State private var colour: KidColour = .seafoam
    @State private var age: String?
    @State private var grade: String?
    @State private var errorMessage = ""
    @State private var busy = false
    @FocusState private var nameFocused: Bool
    /// Set when the kid's details are waiting on the parent's email tap —
    /// the form gives way to ConsentPendingView (web: ConsentPendingPanel).
    @State private var pending: KidProfilesService.PendingConsent?

    private var trimmedName: String { firstName.trimmingCharacters(in: .whitespaces) }
    private var complete: Bool { !trimmedName.isEmpty && age != nil && grade != nil }

    var body: some View {
        if let pending {
            ConsentPendingView(
                pending: pending,
                email: app.supabase.userEmail ?? "your email",
                onResend: { try await app.kidProfiles.requestParentalConsent(firstName: pending.firstName, age: pending.age, grade: pending.grade, colour: pending.colour) },
                onConfirmed: { kid in
                    self.pending = nil
                    Task {
                        // The grant made the profile without the colour; write it now.
                        var saved = kid
                        if let colour = pending.colour { saved = await app.kidProfiles.setColour(colour, for: kid) }
                        onDone([saved])
                    }
                },
                checkConfirmed: { await app.kidProfiles.confirmedKid(named: pending.firstName) }
            )
        } else {
            form
        }
    }

    private var form: some View {
        let regular = sizeClass == .regular
        return VStack(alignment: .leading, spacing: 0) {
            Text("Who's learning?")
                .font(theme.displayFont(size: regular ? 42 : 36))
                .foregroundStyle(Theme.ink)
                .padding(.top, 20)
            Text("First name, age and grade. That's all we store about your child.")
                .font(theme.bodyFont(size: 18, weight: .semibold))
                .foregroundStyle(Theme.ink.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)

            // iPad: name and colour share a row; iPhone stacks them.
            if regular {
                HStack(alignment: .top, spacing: 48) {
                    nameField.frame(maxWidth: 500)
                    colourField
                }
                .padding(.top, 40)
            } else {
                nameField.padding(.top, 36)
                colourField.padding(.top, 28)
            }

            Text("Age")
                .font(theme.bodyFont(size: 16, weight: .bold))
                .foregroundStyle(Theme.ink)
                .padding(.top, regular ? 40 : 28)
                .padding(.bottom, 10)
            tileGrid(KidProfilesService.ages, selection: $age, columns: regular ? 8 : 4, regular: regular)

            Text("Grade")
                .font(theme.bodyFont(size: 16, weight: .bold))
                .foregroundStyle(Theme.ink)
                .padding(.top, regular ? 32 : 24)
                .padding(.bottom, 10)
            tileGrid(KidProfilesService.grades, selection: $grade, columns: regular ? 7 : 4, regular: regular)

            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ember)
                    .padding(.top, 14)
            }

            Spacer(minLength: 40)

            if regular {
                HStack(alignment: .center) {
                    footnote
                    Spacer()
                    cta(fullWidth: false)
                }
            } else {
                cta(fullWidth: true)
                footnote.padding(.top, 14)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("First name")
                .font(theme.bodyFont(size: 16, weight: .bold))
                .foregroundStyle(Theme.ink)
            TextField("", text: $firstName)
                .font(theme.bodyFont(size: 22, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .focused($nameFocused)
                .padding(.horizontal, 22)
                .frame(height: 68)
                .background(RoundedRectangle(cornerRadius: 16).fill(.white))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(nameFocused ? Theme.teal : Theme.ink.opacity(0.12), lineWidth: nameFocused ? 2 : 1.5))
        }
    }

    private var colourField: some View {
        VStack(alignment: .leading, spacing: 10) {
            (Text("Their colour").font(theme.bodyFont(size: 16, weight: .bold)).foregroundColor(Theme.ink)
                + Text(sizeClass == .regular ? " · helps them find their profile" : "").font(theme.bodyFont(size: 15, weight: .semibold)).foregroundColor(Theme.ink.opacity(0.6)))
            KidColourPicker(selected: $colour, initial: String(trimmedName.prefix(1)).uppercased(), size: sizeClass == .regular ? 64 : 52)
        }
    }

    /// The 2a tile row (age and grade share it): white tiles, the selected
    /// one teal with a bottom edge.
    private func tileGrid(_ options: [String], selection: Binding<String?>, columns count: Int, regular: Bool) -> some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: count)
        return LazyVGrid(columns: columns, spacing: 12) {
            ForEach(options, id: \.self) { option in
                let isSelected = selection.wrappedValue == option
                Button { selection.wrappedValue = option } label: {
                    Text(option)
                        .font(theme.displayFont(size: 20))
                        .foregroundStyle(isSelected ? Theme.cream : Theme.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: regular ? 64 : 56)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(isSelected ? Theme.teal : Color.white)
                                .shadow(color: isSelected ? Theme.deepTeal : .clear, radius: 0, x: 0, y: 4)
                        )
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(isSelected ? Color.clear : Theme.ink.opacity(0.12), lineWidth: 1.5))
                }
                .buttonStyle(SpringButtonStyle())
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
    }

    private var footnote: some View {
        Text("You can add more kids from Grown-ups at any time.")
            .font(theme.bodyFont(size: 14, weight: .semibold))
            .foregroundStyle(Theme.ink.opacity(0.6))
    }

    private func cta(fullWidth: Bool) -> some View {
        Button {
            Task { await save() }
        } label: {
            Text(trimmedName.isEmpty ? "Start their first flight" : "Start \(trimmedName)'s first flight")
                .font(theme.displayFont(size: 20))
                .foregroundStyle(Theme.cream)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .padding(.horizontal, fullWidth ? 16 : 52)
                .frame(maxWidth: fullWidth ? .infinity : nil)
                .frame(height: 64)
                .background(RoundedRectangle(cornerRadius: 18).fill(Theme.teal).shadow(color: Theme.deepTeal, radius: 0, x: 0, y: 5))
                .opacity(busy || !complete ? 0.4 : 1)
        }
        .buttonStyle(SpringButtonStyle())
        .disabled(busy || !complete)
    }

    private func save() async {
        guard let age, let grade, complete else { return }
        busy = true
        defer { busy = false }
        do {
            switch try await app.kidProfiles.addKid(firstName: trimmedName, age: age, grade: grade, colour: colour) {
            case .added(let kid):
                errorMessage = ""
                onDone([kid])
            case .pendingConsent(let request):
                // Nothing is stored yet; the parent confirms by email.
                errorMessage = ""
                pending = request
            }
        } catch {
            errorMessage = "Could not save — \(error.localizedDescription)"
        }
    }
}

/// The four colour circles (2a · 04): the selected one shows the kid's
/// initial and a teal ring.
struct KidColourPicker: View {
    @Environment(\.theme) private var theme
    @Binding var selected: KidColour
    var initial: String = ""
    var size: CGFloat = 64

    var body: some View {
        HStack(spacing: 14) {
            ForEach(KidColour.allCases) { colour in
                let isSelected = colour == selected
                Button { selected = colour } label: {
                    ZStack {
                        Circle().fill(colour.fill)
                        if isSelected {
                            Text(initial)
                                .font(theme.displayFont(size: size * 0.42))
                                .foregroundStyle(Theme.ink)
                        }
                    }
                    .frame(width: size, height: size)
                    .overlay(Circle().stroke(Theme.teal, lineWidth: isSelected ? 3 : 0).padding(-4))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(colour.rawValue) colour")
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .padding(4)
    }
}

// MARK: - 04 · Soft paywall

private struct PlanStep: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.openURL) private var openURL
    let kidName: String?
    let onDone: () -> Void

    @State private var purchasing = false
    // Auto-renewal consent is its own affirmative act: never pre-ticked,
    // and the purchase button stays dead until it is ticked.
    @State private var autoRenewAck = false
    @State private var annualSelected = true
    // Kids category: purchases and external links sit behind the parental
    // gate, same as PaywallView.
    @State private var gateUnlocked = false
    @State private var showGate = false
    @State private var gatedAction: (() -> Void)?

    private var selectedProduct: Product? {
        annualSelected ? app.store.annual : app.store.monthly
    }

    /// nil until StoreKit answers — no disclosure without the real price.
    private var disclosureLabel: String? {
        guard let product = selectedProduct else { return nil }
        return AutoRenewalTerms.label(price: product.displayPrice, period: annualSelected ? "year" : "month")
    }

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

            Text("Cancel anytime in Settings → Apple Account → Subscriptions — one step, no questions asked. The free plan is free forever.")
                .font(theme.bodyFont(size: 13))
                .foregroundStyle(Theme.ink.opacity(0.6))
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
                .padding(.top, 20)

            HStack(spacing: 6) {
                Button("How to cancel") { gate { openURL(AppLinks.manageSubscriptions) } }
                Text("·").foregroundStyle(Theme.ink.opacity(0.4))
                Button("Terms") { gate { openURL(AppLinks.terms) } }
                Text("·").foregroundStyle(Theme.ink.opacity(0.4))
                Button("Privacy") { gate { openURL(AppLinks.privacyPolicy) } }
            }
            .font(theme.bodyFont(size: 13, weight: .bold))
            .foregroundStyle(Theme.teal)
            .frame(maxWidth: .infinity)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .sheet(isPresented: $showGate) {
            ParentalGateView {
                gateUnlocked = true
                gatedAction?()
                gatedAction = nil
            }
        }
        .onChange(of: app.store.hasPremium) {
            if app.store.hasPremium { onDone() }
        }
    }

    /// Purchases and external links require the parental gate (once per
    /// visit to this step).
    private func gate(_ action: @escaping () -> Void) {
        if gateUnlocked {
            action()
        } else {
            gatedAction = action
            showGate = true
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
            bullet("Printable worksheets for any game, with answer keys")
            bullet("Progress syncs across devices")
            VStack(spacing: 8) {
                // The state auto-renewal disclosure, before the purchase step:
                // trial end date, first charge amount and date, renewal terms.
                AutoRenewalConsentBox(
                    ack: $autoRenewAck,
                    label: disclosureLabel ?? "The auto-renewal terms will appear once prices load."
                )
                    .padding(.top, 4)

                Button {
                    purchase(selectedProduct)
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
                        .opacity(autoRenewAck ? 1 : 0.5)
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(purchasing || !autoRenewAck || selectedProduct == nil)

                Button(
                    annualSelected
                        ? "or switch to \(app.store.monthly?.displayPrice ?? "$8.99")/month"
                        : "or switch to \(app.store.annual?.displayPrice ?? "$54.99")/year"
                ) {
                    annualSelected.toggle()
                }
                .font(theme.bodyFont(size: 14, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.7))
                .disabled(purchasing)
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
        gate {
            Task {
                purchasing = true
                await app.store.purchase(product)
                purchasing = false
            }
        }
    }
}
