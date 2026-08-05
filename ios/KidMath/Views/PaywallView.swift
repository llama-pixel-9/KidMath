import StoreKit
import SwiftUI

/// The subscription paywall. Leads with the annual plan (49% off, the price
/// that's meant to be bought); monthly is shown flat and never discounted.
/// Purchases are behind the parental gate (Kids-category requirement).
struct PaywallView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    @Environment(\.openURL) private var openURL

    @State private var gatedAction: (() -> Void)?
    @State private var showGate = false
    @State private var purchasing = false
    // Auto-renewal consent is its own affirmative act: never pre-ticked,
    // and the purchase button stays dead until it is.
    @State private var autoRenewAck = false
    @State private var selectedPlan: Plan = .annual

    enum Plan { case annual, monthly }

    private var store: StoreService { app.store }

    private var selectedProduct: Product? {
        selectedPlan == .annual ? store.annual : store.monthly
    }

    private var disclosureLabel: String {
        let price = selectedProduct?.displayPrice ?? (selectedPlan == .annual ? "$54.99" : "$8.99")
        let period = selectedPlan == .annual ? "year" : "month"
        return AutoRenewalTerms.label(price: price, period: period)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    header
                    featureList
                    planCards
                    disclosureBlock
                    subscribeButton
                    Button("Restore purchases") {
                        gate { Task { await store.restorePurchases() } }
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
                    if !store.lastError.isEmpty {
                        Text(store.lastError).font(.footnote).foregroundStyle(.red)
                    }
                    Text("One subscription covers every child in your household. Payment is charged to your Apple account after the free trial ends.")
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

    // Plan cards are selectors — the single purchase button below the
    // disclosure is the only way to buy, and it stays disabled until the
    // auto-renewal box is ticked.
    private var planCards: some View {
        VStack(spacing: 12) {
            if store.annual != nil {
                planCard(
                    .annual,
                    tagline: "BEST VALUE · 49% OFF",
                    detail: "\(store.annual?.displayPrice ?? "$54.99")/year — that's $4.58/month"
                )
            }
            if store.monthly != nil {
                planCard(
                    .monthly,
                    tagline: nil,
                    detail: "\(store.monthly?.displayPrice ?? "$8.99")/month"
                )
            }
            if store.annual == nil && store.monthly == nil {
                ProgressView().padding()
            }
        }
    }

    private func planCard(_ plan: Plan, tagline: String?, detail: String) -> some View {
        let selected = selectedPlan == plan
        return Button {
            selectedPlan = plan
        } label: {
            VStack(spacing: 6) {
                if let tagline {
                    Text(tagline)
                        .font(.caption.weight(.heavy))
                        .kerning(1)
                        .foregroundStyle(selected ? Theme.cream : theme.textMuted)
                }
                Text(detail)
                    .font(.title3.weight(.heavy))
                    .fontDesign(.rounded)
                    .foregroundStyle(selected ? Theme.cream : theme.textPrimary)
                Text("14-day free trial, then auto-renews")
                    .font(.caption)
                    .foregroundStyle(selected ? Theme.cream.opacity(0.85) : theme.textMuted)
            }
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 20).fill(
                    selected
                        ? AnyShapeStyle(Theme.teal)
                        : AnyShapeStyle(theme.cardBackground)
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(selected ? .clear : theme.cardBorder, lineWidth: 1.5)
            )
        }
        .buttonStyle(SpringButtonStyle())
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    /// The state auto-renewal disclosure: trial end date, first charge amount
    /// and date, renewal terms, cancellation path, Terms and Privacy — all
    /// before the purchase step. See docs/legal-implementation.md step 5.
    private var disclosureBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            AutoRenewalConsentBox(ack: $autoRenewAck, label: disclosureLabel)
            HStack(spacing: 6) {
                legalLink("How to cancel", AppLinks.manageSubscriptions)
                Text("·").foregroundStyle(theme.textMuted)
                legalLink("Terms", AppLinks.terms)
                Text("·").foregroundStyle(theme.textMuted)
                legalLink("Privacy", AppLinks.privacyPolicy)
            }
            Text("Cancel anytime in Settings → Apple Account → Subscriptions — one step, no questions asked.")
                .font(.caption2)
                .foregroundStyle(theme.textMuted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(theme.cardBackground))
    }

    /// External links sit behind the parental gate (Kids category).
    private func legalLink(_ title: String, _ url: URL) -> some View {
        Button(title) {
            gate { openURL(url) }
        }
        .font(.caption.weight(.bold))
        .foregroundStyle(Theme.teal)
    }

    private var subscribeButton: some View {
        Button {
            gate {
                Task {
                    purchasing = true
                    if let product = selectedProduct {
                        await store.purchase(product)
                    }
                    purchasing = false
                }
            }
        } label: {
            Text("Start my 14-day free trial")
                .font(.headline.weight(.heavy))
                .fontDesign(.rounded)
                .foregroundStyle(Theme.cream)
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity)
                .background(RoundedRectangle(cornerRadius: 20).fill(Theme.teal))
        }
        .buttonStyle(SpringButtonStyle())
        .disabled(purchasing || !autoRenewAck || selectedProduct == nil)
        .opacity(autoRenewAck ? 1 : 0.5)
    }

    private func gate(_ action: @escaping () -> Void) {
        gatedAction = action
        showGate = true
    }
}
