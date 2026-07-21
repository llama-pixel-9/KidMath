import StoreKitTest
import XCTest
@testable import KidMath

final class StoreTests: XCTestCase {

    // MARK: - Full purchase path against the local store config

    /// Products load with the locked pricing, and a (dialog-less) purchase
    /// flips hasPremium — the entire StoreKit path without App Store Connect.
    @MainActor
    func testPurchaseGrantsPremium() async throws {
        let configURL = try XCTUnwrap(
            Bundle(for: Self.self).url(forResource: "KidMath", withExtension: "storekit")
        )
        let session = try SKTestSession(contentsOf: configURL)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true

        // storekitd's Xcode-test interface is only reachable from
        // Xcode-launched runs on this toolchain; headless xcodebuild gets
        // `notEntitled`. Skip there — the test still runs fully in Xcode.
        do {
            _ = try await session.buyProduct(identifier: StoreService.annualID)
        } catch {
            throw XCTSkip("SKTestSession unavailable in this environment: \(error)")
        }
        session.clearTransactions()

        let store = StoreService(supabase: .shared)
        await store.loadProducts()
        let annual = try XCTUnwrap(store.annual, "annual plan missing: \(store.lastError)")
        let monthly = try XCTUnwrap(store.monthly)
        XCTAssertEqual(annual.displayPrice, "$54.99")
        XCTAssertEqual(monthly.displayPrice, "$8.99")
        XCTAssertEqual(annual.subscription?.introductoryOffer?.paymentMode, .freeTrial,
                       "annual must carry the 14-day free trial")

        await store.refreshEntitlement()
        XCTAssertFalse(store.hasPremium, "fresh session must not be premium")

        let purchased = await store.purchase(annual)
        XCTAssertTrue(purchased, "purchase failed: \(store.lastError)")
        XCTAssertTrue(store.hasPremium, "verified purchase must unlock premium")

        session.clearTransactions()
    }

    // MARK: - Parental gate

    func testParentalGateChallengeSpellsOutOperands() {
        let challenge = ParentalGate.makeChallenge(a: 34, b: 28)
        XCTAssertEqual(challenge.answer, 62)
        XCTAssertEqual(challenge.question, "What is thirty-four plus twenty-eight?")
        XCTAssertFalse(challenge.question.contains("34"), "digits must not appear — pre-readers can copy digits")
    }

    // MARK: - Entitlement row mapping (public.entitlements shape)

    func testEntitlementRowShape() {
        let expires = Date(timeIntervalSince1970: 1_800_000_000)
        let row = StoreService.entitlementRow(productID: StoreService.annualID, expiresAt: expires)
        XCTAssertEqual(row["status"] as? String, "active")
        XCTAssertEqual(row["source"] as? String, "appstore")
        XCTAssertEqual(row["product_id"] as? String, "com.kidmath.app.premium.annual")
        XCTAssertNotNil(row["expires_at"] as? String)
    }

    func testRowIsActiveRespectsStatusAndExpiry() {
        let now = Date(timeIntervalSince1970: 1_000_000)
        let future = ISO8601DateFormatter().string(from: now.addingTimeInterval(3600))
        let past = ISO8601DateFormatter().string(from: now.addingTimeInterval(-3600))

        XCTAssertTrue(StoreService.rowIsActive(["status": "active", "expires_at": future], now: now))
        XCTAssertTrue(StoreService.rowIsActive(["status": "grace", "expires_at": future], now: now))
        XCTAssertFalse(StoreService.rowIsActive(["status": "active", "expires_at": past], now: now),
                       "expired timestamp beats a stale 'active' status")
        XCTAssertFalse(StoreService.rowIsActive(["status": "expired", "expires_at": future], now: now))
        XCTAssertFalse(StoreService.rowIsActive(["status": "none"], now: now))
        XCTAssertTrue(StoreService.rowIsActive(["status": "active"], now: now),
                      "no expiry (e.g. promotional grant) counts as active")
    }
}
