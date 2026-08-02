import SwiftUI

/// §20 screen 05 — the returning path. Kid-facing, so it gets the bird
/// voice. Tinted discs, first name only — no level, no streak. Parent
/// settings sit top-right; kids never see a login form.
struct ProfilePickerView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var showSettings = false
    @State private var showAddKid = false

    private static let discTints: [Color] = [
        Theme.tealMid, Theme.apricot, Theme.seafoam, Theme.sunLight,
    ]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                HStack(spacing: 8) {
                    LarkMarkView().frame(height: 26)
                    Text("larkit")
                        .font(theme.displayFont(size: 26))
                        .foregroundStyle(Theme.teal)
                }
                Spacer()
                Button("Parent settings") { showSettings = true }
                    .font(theme.bodyFont(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }
            .padding(.horizontal, 20)
            .padding(.top, 18)

            Spacer()

            Text("Welcome back — who's flying?")
                .font(theme.displayFont(size: 34))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            let columns = [GridItem(.adaptive(minimum: 150, maximum: 190), spacing: 28)]
            LazyVGrid(columns: columns, spacing: 28) {
                ForEach(Array(app.kidProfiles.kids.enumerated()), id: \.element.id) { index, kid in
                    Button {
                        app.kidProfiles.setActiveKid(kid)
                        dismiss()
                    } label: {
                        VStack(spacing: 14) {
                            Text(String(kid.firstName.prefix(1)).uppercased())
                                .font(theme.displayFont(size: 56))
                                .foregroundStyle(Theme.ink)
                                .frame(width: 150, height: 150)
                                .background(Circle().fill(Self.discTints[index % Self.discTints.count]))
                            Text(kid.firstName)
                                .font(theme.bodyFont(size: 19, weight: .semibold))
                                .foregroundStyle(Theme.ink)
                        }
                    }
                    .buttonStyle(SpringButtonStyle())
                }

                if app.kidProfiles.kids.count < KidProfilesService.maxKids {
                    Button {
                        showAddKid = true
                    } label: {
                        VStack(spacing: 14) {
                            Text("+")
                                .font(theme.displayFont(size: 40))
                                .foregroundStyle(Theme.teal)
                                .frame(width: 150, height: 150)
                                .background(
                                    Circle()
                                        .stroke(
                                            Theme.teal.opacity(0.4),
                                            style: StrokeStyle(lineWidth: 2, dash: [6, 6])
                                        )
                                )
                            Text("Add")
                                .font(theme.bodyFont(size: 19, weight: .semibold))
                                .foregroundStyle(Theme.teal)
                        }
                    }
                    .buttonStyle(SpringButtonStyle())
                }
            }
            .frame(maxWidth: 640)
            .padding(.top, 44)
            .padding(.horizontal, 24)

            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.cream)
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showAddKid) {
            NavigationStack {
                ScrollView {
                    KidStep { kids in
                        if let kid = kids.first, app.kidProfiles.kids.count == kids.count {
                            // First kid added from an empty picker: fly straight in.
                            app.kidProfiles.setActiveKid(kid)
                            dismiss()
                        }
                        showAddKid = false
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                }
                .background(Theme.cream)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { showAddKid = false }
                    }
                }
            }
        }
        .task { await app.kidProfiles.refresh() }
    }
}
