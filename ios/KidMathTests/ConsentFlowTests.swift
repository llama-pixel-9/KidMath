import XCTest
@testable import KidMath

/// The COPPA email-plus flow on iOS mirrors src/kidProfiles.js: the direct
/// notice the app sends comes from the engine bundle (one source with the
/// web), and the resend cooldown matches consentResend.js.
@MainActor
final class ConsentFlowTests: XCTestCase {

    func testEngineShipsTheFilledDirectNotice() throws {
        let notice = try EngineBridge().parentalConsentNotice()
        XCTAssertTrue(notice.markdown.hasPrefix("# Parental Consent Notice"))
        XCTAssertGreaterThan(notice.markdown.count, 2000)
        XCTAssertFalse(notice.markdown.contains("{{"), "entity tokens must be filled")
        XCTAssertFalse(notice.markdown.contains("Drafting note"), "internal notes never reach a parent")
        // §312.4(d)(1) operator identity, as on the web.
        XCTAssertTrue(notice.markdown.contains("Larkit Labs LLC"))
        XCTAssertTrue(notice.markdown.contains("(814) 273-8760"))
        XCTAssertTrue(notice.markdown.contains("privacy@larkit.io"))
        XCTAssertEqual(notice.version, "2026-08-06")
        XCTAssertEqual(notice.termsVersion, "2026-08-05")
        XCTAssertEqual(notice.privacyVersion, "2026-08-06")
    }

    func testResendCooldownMatchesTheWeb() {
        XCTAssertEqual(KidProfilesService.resendCooldownSeconds, 60)
        let sent = Date()
        XCTAssertEqual(ConsentPendingView.cooldownLeft(since: sent, now: sent), 60)
        XCTAssertEqual(ConsentPendingView.cooldownLeft(since: sent, now: sent.addingTimeInterval(45)), 15)
        XCTAssertEqual(ConsentPendingView.cooldownLeft(since: sent, now: sent.addingTimeInterval(61)), 0)
        XCTAssertEqual(ConsentPendingView.cooldownLeft(since: sent, now: sent.addingTimeInterval(600)), 0)
    }

    func testKidLimitMessageIsParentLanguage() {
        XCTAssertEqual(
            KidProfilesService.kidLimitMessage,
            "Four kids is the limit for one account. Remove a profile on the account page to add another."
        )
    }

    /// Signed out, addKid must refuse before any network call — and the
    /// consent gate reads false rather than throwing.
    func testSignedOutIsGatedBeforeAnyWrite() async throws {
        let service = KidProfilesService(supabase: .shared, consentNotice: {
            XCTFail("notice must not be requested when signed out")
            throw NSError(domain: "test", code: 0)
        })
        let consented = await service.hasParentalConsent()
        XCTAssertFalse(consented)
        do {
            _ = try await service.addKid(firstName: "Ari", age: "6", grade: "1st")
            XCTFail("expected Sign in first")
        } catch {
            XCTAssertEqual(error.localizedDescription, "Sign in first")
        }
    }
}
