import SwiftUI

/// The returning path (handoff 2a · 05): "Who's flying today?", one circle
/// per kid in their colour with the initial and a darker bottom edge, a
/// dashed "Add a kid", and "Grown-ups" top-right. Kid-facing, so no login
/// form ever; "Add a kid" and "Grown-ups" both go through the grown-up check.
struct ProfilePickerView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var showSettings = false
    @State private var showAddKid = false
    @State private var showGate = false
    @State private var gatedAction: (() -> Void)?

    var body: some View {
        let regular = sizeClass == .regular
        let disc: CGFloat = regular ? 180 : 132
        ZStack {
            VStack(spacing: 0) {
                HStack {
                    HStack(spacing: 8) {
                        LarkMarkView().frame(width: 32, height: 27)
                        Text("larkit")
                            .font(theme.displayFont(size: 24))
                            .foregroundStyle(Theme.teal)
                    }
                    Spacer()
                    Button {
                        gate { showSettings = true }
                    } label: {
                        Label("Grown-ups", systemImage: "lock")
                            .font(theme.bodyFont(size: 16, weight: .bold))
                            .foregroundStyle(Theme.ink)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, regular ? 64 : 24)
                .padding(.top, 20)

                Spacer()

                Text("Who's flying today?")
                    .font(theme.displayFont(size: regular ? 48 : 34))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)

                let columns = regular
                    ? [GridItem(.adaptive(minimum: disc, maximum: disc + 40), spacing: 40)]
                    : Array(repeating: GridItem(.flexible(), spacing: 24), count: 2)
                LazyVGrid(columns: columns, spacing: regular ? 40 : 28) {
                    ForEach(app.kidProfiles.kids) { kid in
                        let colour = KidColour.forKid(kid, among: app.kidProfiles.kids)
                        Button {
                            app.kidProfiles.setActiveKid(kid)
                            dismiss()
                        } label: {
                            VStack(spacing: 16) {
                                Text(kid.initial)
                                    .font(theme.displayFont(size: regular ? 76 : 56))
                                    .foregroundStyle(Theme.ink)
                                    .frame(width: disc, height: disc)
                                    .background(Circle().fill(colour.fill).shadow(color: colour.edge, radius: 0, x: 0, y: 6))
                                Text(kid.firstName)
                                    .font(theme.displayFont(size: regular ? 22 : 19))
                                    .foregroundStyle(Theme.ink)
                            }
                        }
                        .buttonStyle(SpringButtonStyle())
                    }

                    if app.kidProfiles.kids.count < KidProfilesService.maxKids {
                        Button {
                            gate { showAddKid = true }
                        } label: {
                            VStack(spacing: 16) {
                                Image(systemName: "plus")
                                    .font(.system(size: regular ? 40 : 30, weight: .medium))
                                    .foregroundStyle(Theme.ink.opacity(0.4))
                                    .frame(width: disc, height: disc)
                                    .background(Circle().stroke(Theme.ink.opacity(0.2), style: StrokeStyle(lineWidth: 2, dash: [6, 6])))
                                Text("Add a kid")
                                    .font(theme.displayFont(size: regular ? 22 : 19))
                                    .foregroundStyle(Theme.ink.opacity(0.6))
                            }
                        }
                        .buttonStyle(SpringButtonStyle())
                    }
                }
                .frame(maxWidth: regular ? 720 : 400)
                .padding(.top, regular ? 56 : 40)
                .padding(.horizontal, 24)

                Spacer()

                Text("\u{201C}Add a kid\u{201D} asks the grown-up check first.")
                    .font(theme.bodyFont(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.6))
                    .padding(.bottom, 32)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(GraphPaperBackground())

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
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
                .background(GraphPaperBackground())
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { showAddKid = false }
                    }
                }
            }
        }
        .task { await app.kidProfiles.refresh() }
    }

    private func gate(_ action: @escaping () -> Void) {
        gatedAction = action
        withAnimation(.easeOut(duration: 0.2)) { showGate = true }
    }
}
