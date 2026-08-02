import Foundation
import StoreKit

/// StoreKit 2 subscriptions + the shared Supabase entitlement.
///
/// Pricing (locked): $8.99/month (anchor, never discounted) · $54.99/year
/// (49% off — the plan the paywall leads with) · every child in the household
/// included · 14-day free trial on both plans.
///
/// Premium truth is the UNION of:
///  - StoreKit's on-device entitlement (works signed-out, offline, restores);
///  - the Supabase `entitlements` row (so a web Stripe subscription unlocks
///    the app after sign-in, and vice versa).
/// After any verified purchase the client writes the row (v1 trust model
/// documented in the entitlements migration; hardening path is an Edge
/// Function validating receipts server-side).
@MainActor
final class StoreService: ObservableObject {

    static let monthlyID = "com.kidmath.app.premium.monthly"
    static let annualID = "com.kidmath.app.premium.annual"

    /// Launch switch — the Swift mirror of the web's `paywallEnabled()`
    /// (VITE_PAYWALL_ENABLED in src/premium.js). While OFF, every surface is
    /// free: no locks, no plan step in onboarding, no paywall sheets. Flip it
    /// together with the web deploy at billing launch. For manual testing:
    /// `simctl launch … -paywallEnabled 1` forces it on via the argument
    /// domain.
    nonisolated static var paywallEnabled: Bool {
        if UserDefaults.standard.object(forKey: "paywallEnabled") != nil {
            return UserDefaults.standard.bool(forKey: "paywallEnabled")
        }
        return false
    }

    /// What the UI gates on: everything is unlocked until the launch switch
    /// flips, and afterwards a trial/subscription is required.
    var isUnlocked: Bool { !Self.paywallEnabled || hasPremium }

    @Published private(set) var monthly: Product?
    @Published private(set) var annual: Product?
    @Published private(set) var hasPremium = false
    @Published private(set) var lastError = ""

    private let supabase: SupabaseService
    private var updatesTask: Task<Void, Never>?

    /// `autostart: false` defers all StoreKit traffic: under XCTest the host
    /// app must NOT touch StoreKit before a test creates its SKTestSession,
    /// or the session fails with `notEntitled`.
    init(supabase: SupabaseService = .shared, autostart: Bool = true) {
        self.supabase = supabase
        guard autostart else { return }
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                guard let self, case .verified(let transaction) = update else { continue }
                await transaction.finish()
                await self.refreshEntitlement()
            }
        }
        Task {
            await loadProducts()
            await refreshEntitlement()
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    func loadProducts() async {
        do {
            let products = try await Product.products(for: [Self.monthlyID, Self.annualID])
            monthly = products.first { $0.id == Self.monthlyID }
            annual = products.first { $0.id == Self.annualID }
        } catch {
            lastError = "Could not load subscription plans: \(error.localizedDescription)"
        }
    }

    /// True when either store has an active entitlement.
    func refreshEntitlement() async {
        var active = false
        var latest: Transaction?
        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement,
                  transaction.productType == .autoRenewable,
                  transaction.revocationDate == nil else { continue }
            active = true
            latest = transaction
        }
        if let latest {
            await syncToSupabase(latest)
        }
        if !active, supabase.isSignedIn {
            active = await hasActiveSupabaseEntitlement()
        }
        hasPremium = active
    }

    @discardableResult
    func purchase(_ product: Product) async -> Bool {
        lastError = ""
        do {
            let result = try await product.purchase()
            switch result {
            case .success(.verified(let transaction)):
                await transaction.finish()
                await refreshEntitlement()
                return hasPremium
            case .success(.unverified):
                lastError = "Purchase could not be verified."
                return false
            case .userCancelled, .pending:
                return false
            @unknown default:
                return false
            }
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }

    func restorePurchases() async {
        lastError = ""
        do {
            try await AppStore.sync()
        } catch {
            lastError = error.localizedDescription
        }
        await refreshEntitlement()
    }

    // MARK: - Shared entitlement (Supabase)

    /// The row shape for public.entitlements (see the migration header).
    nonisolated static func entitlementRow(productID: String, expiresAt: Date?) -> [String: Any] {
        [
            "status": "active",
            "source": "appstore",
            "product_id": productID,
            "expires_at": expiresAt.map { ISO8601DateFormatter().string(from: $0) } ?? NSNull(),
        ]
    }

    /// A row is active while status says so and expires_at hasn't passed
    /// (StoreKit grace handling sets status accordingly on next refresh).
    nonisolated static func rowIsActive(_ row: [String: Any], now: Date = Date()) -> Bool {
        let status = row["status"] as? String
        guard status == "active" || status == "grace" else { return false }
        guard let expires = row["expires_at"] as? String else { return true }
        guard let date = ISO8601DateFormatter.flexible.dateFlexible(from: expires) else { return true }
        return date > now
    }

    private func syncToSupabase(_ transaction: Transaction) async {
        guard let userId = supabase.userId else { return } // synced on next sign-in
        let row = Self.entitlementRow(productID: transaction.productID, expiresAt: transaction.expirationDate)
        try? await supabase.upsertEntitlement(userId: userId, row: row)
    }

    private func hasActiveSupabaseEntitlement() async -> Bool {
        guard let userId = supabase.userId,
              let row = try? await supabase.fetchEntitlement(userId: userId) else { return false }
        return Self.rowIsActive(row)
    }
}
