import StoreKit
import SwiftUI

/// The subscription paywall. Leads with the annual plan (49% off, the price
/// that's meant to be bought); monthly is shown flat and never discounted.
/// Purchases are behind the parental gate (Kids-category requirement).
struct PaywallView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var gatedAction: (() -> Void)?
    @State private var showGate = false
    @State private var purchasing = false

    private var store: StoreService { app.store }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    header
                    featureList
                    planCards
                    Button("Restore purchases") {
                        gate { Task { await store.restorePurchases() } }
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
                    if !store.lastError.isEmpty {
                        Text(store.lastError).font(.footnote).foregroundStyle(.red)
                    }
                    Text("One subscription covers every child in your household. Cancel anytime in Settings. Payment is charged to your Apple account after the free trial ends.")
                        .font(.caption)
                        .foregroundStyle(theme.textMuted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: 480)
                .padding()
                .frame(maxWidth: .infinity)
            }
            .background(theme.background)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(theme.textMuted)
                    }
                }
            }
            .sheet(isPresented: $showGate) {
                ParentalGateView {
                    gatedAction?()
                    gatedAction = nil
                }
            }
            .onChange(of: store.hasPremium) {
                if store.hasPremium { dismiss() }
            }
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("🌟")
                .font(.system(size: 52))
            Text("Unlock all of larkit")
                .font(theme.displayFont(size: 28))
                .minimumScaleFactor(0.6)
                .lineLimit(1)
                .foregroundStyle(theme.textPrimary)
            Text("Try everything free for 14 days")
                .font(.headline)
                .foregroundStyle(theme.textSecondary)
        }
    }

    private var featureList: some View {
        VStack(alignment: .leading, spacing: 10) {
            feature("🧮", "All 22 practice modes, Grades 1-4")
            feature("🖨️", "Printable PDF worksheets with answer keys")
            feature("☁️", "Progress syncs across iPad, iPhone, and the web")
            feature("👧👦", "Every child in your household — one price")
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 20).fill(theme.cardBackground))
    }

    private func feature(_ emoji: String, _ text: String) -> some View {
        HStack(spacing: 10) {
            Text(emoji)
            Text(text)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.textPrimary)
        }
    }

    private var planCards: some View {
        VStack(spacing: 12) {
            if let annual = store.annual {
                planCard(
                    annual,
                    tagline: "BEST VALUE · 49% OFF",
                    detail: "\(annual.displayPrice)/year — that's $4.58/month",
                    highlighted: true
                )
            }
            if let monthly = store.monthly {
                planCard(
                    monthly,
                    tagline: nil,
                    detail: "\(monthly.displayPrice)/month",
                    highlighted: false
                )
            }
            if store.annual == nil && store.monthly == nil {
                ProgressView().padding()
            }
        }
    }

    private func planCard(_ product: Product, tagline: String?, detail: String, highlighted: Bool) -> some View {
        Button {
            gate {
                Task {
                    purchasing = true
                    await store.purchase(product)
                    purchasing = false
                }
            }
        } label: {
            VStack(spacing: 6) {
                if let tagline {
                    Text(tagline)
                        .font(.caption.weight(.heavy))
                        .kerning(1)
                        .foregroundStyle(highlighted ? Theme.cream : theme.textMuted)
                }
                Text(detail)
                    .font(.title3.weight(.heavy))
                    .fontDesign(.rounded)
                    .foregroundStyle(highlighted ? Theme.cream : theme.textPrimary)
                Text("14-day free trial, then auto-renews")
                    .font(.caption)
                    .foregroundStyle(highlighted ? Theme.cream.opacity(0.85) : theme.textMuted)
            }
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 20).fill(
                    highlighted
                        ? AnyShapeStyle(Theme.teal)
                        : AnyShapeStyle(theme.cardBackground)
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(highlighted ? .clear : theme.cardBorder, lineWidth: 1.5)
            )
        }
        .buttonStyle(SpringButtonStyle())
        .disabled(purchasing)
    }

    private func gate(_ action: @escaping () -> Void) {
        gatedAction = action
        showGate = true
    }
}
