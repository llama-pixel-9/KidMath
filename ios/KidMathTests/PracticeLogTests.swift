import XCTest
@testable import KidMath

/// The practice log on iOS is the web's record, byte for byte: opened,
/// appended and closed by the shared engine, mirrored locally under the
/// web's key, and turned into a practice_sessions row by the same mapper.
@MainActor
final class PracticeLogTests: XCTestCase {

    private func makeLog(_ name: String) throws -> (PracticeLog, UserDefaults) {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: name))
        defaults.removePersistentDomain(forName: name)
        defaults.set("kid-1", forKey: "kidmath-active-kid")
        return (PracticeLog(engine: try EngineBridge(), supabase: .shared, defaults: defaults), defaults)
    }

    func testRecordLifecycleMatchesTheWebShape() throws {
        let (log, _) = try makeLog(#function)
        let t0 = Date(timeIntervalSince1970: 1_800_000_000)
        var rec = try XCTUnwrap(log.open(mode: "addition", level: 3, now: t0))
        XCTAssertEqual(rec["kidId"] as? String, "kid-1")
        XCTAssertEqual(rec["kind"] as? String, "normal")
        XCTAssertEqual((rec["levelStart"] as? NSNumber)?.intValue, 3)

        let q: [String: Any] = ["display": ["promptText": "Mia has 2 apples and gets 3 more. How many apples does Mia have?"],
                                "answer": 5, "metadata": ["subskill": "joinResultUnknown", "itemFamily": "application", "itemId": "add-1"]]
        rec = try XCTUnwrap(log.append(rec, question: q, submitted: 4, correct: false, wasRetry: false, responseTimeMs: 4200, level: 3, now: t0.addingTimeInterval(5)))
        rec = try XCTUnwrap(log.append(rec, question: q, submitted: 5, correct: true, wasRetry: true, responseTimeMs: 2100, level: 3, now: t0.addingTimeInterval(9)))
        let attempts = try XCTUnwrap(rec["attempts"] as? [[String: Any]])
        XCTAssertEqual(attempts.count, 2)
        XCTAssertEqual(attempts[0]["given"] as? String, "4")
        XCTAssertEqual(attempts[0]["answer"] as? String, "5")
        XCTAssertEqual(attempts[0]["subskill"] as? String, "joinResultUnknown")
        XCTAssertEqual(attempts[1]["retry"] as? Bool, true)
        XCTAssertEqual((rec["activeMs"] as? NSNumber)?.intValue, 6300)

        let closed = try XCTUnwrap(log.close(rec, session: ["level": 4, "questionsAnswered": 1, "firstTryCorrect": 0, "retriesMastered": 1],
                                             starsEarned: 2, levelEnd: nil, now: t0.addingTimeInterval(120)))
        XCTAssertEqual((closed["levelEnd"] as? NSNumber)?.intValue, 4)
        XCTAssertEqual((closed["durationMs"] as? NSNumber)?.intValue, 120_000)
        XCTAssertEqual((closed["retriesMastered"] as? NSNumber)?.intValue, 1)
        XCTAssertEqual((closed["starsEarned"] as? NSNumber)?.intValue, 2)
    }

    func testDurationIsCappedLikeTheWeb() throws {
        let (log, _) = try makeLog(#function)
        let t0 = Date()
        let rec = try XCTUnwrap(log.open(mode: "counting", level: 1, now: t0))
        let closed = try XCTUnwrap(log.close(rec, session: nil, starsEarned: 0, levelEnd: 1, now: t0.addingTimeInterval(8 * 3600)))
        XCTAssertEqual((closed["durationMs"] as? NSNumber)?.intValue, 30 * 60 * 1000, "an iPad left open overnight is not 8 hours of practice")
    }

    func testSavedRecordsMirrorLocallyUnderTheWebKey() async throws {
        let (log, defaults) = try makeLog(#function)
        let rec = try XCTUnwrap(log.open(mode: "subtraction", level: 2))
        let closed = try XCTUnwrap(log.close(rec, session: nil, starsEarned: 1, levelEnd: 2))
        await log.save(closed)   // signed out in tests → local only, synced=false
        let raw = try XCTUnwrap(defaults.data(forKey: "kidmath-sessions:kid-1"))
        let rows = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [[String: Any]])
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows[0]["synced"] as? Bool, false)
        XCTAssertEqual(rows[0]["mode"] as? String, "subtraction")
        XCTAssertEqual(log.readLocal(kidId: "kid-1").count, 1)
        let loaded = await log.loadSessions()
        XCTAssertEqual(loaded.source, "local")
        XCTAssertEqual(loaded.sessions.count, 1)
    }

    func testReportBuildsFromLocalRecords() throws {
        let (log, _) = try makeLog(#function)
        let now = Date()
        var records: [[String: Any]] = []
        for i in 0..<3 {
            let start = now.addingTimeInterval(Double(-i) * 86_400)
            var rec = try XCTUnwrap(log.open(mode: "multiplication", level: 2, now: start))
            for k in 0..<4 {
                let q: [String: Any] = ["a": 3, "op": "×", "b": k, "answer": 3 * k, "metadata": ["subskill": "facts", "itemFamily": "procedural"]]
                rec = try XCTUnwrap(log.append(rec, question: q, submitted: k == 1 ? 99 : 3 * k, correct: k != 1, wasRetry: false, responseTimeMs: 3000, level: 2, now: start.addingTimeInterval(Double(k) * 5)))
            }
            records.append(try XCTUnwrap(log.close(rec, session: ["level": 2, "questionsAnswered": 4, "firstTryCorrect": 3], starsEarned: 3, levelEnd: 2, now: start.addingTimeInterval(240))))
        }
        let report = try XCTUnwrap(log.buildReport(sessions: records, days: 30, now: now))
        let totals = try XCTUnwrap(report["totals"] as? [String: Any])
        XCTAssertEqual((totals["sessions"] as? NSNumber)?.intValue, 3)
        XCTAssertEqual((totals["questions"] as? NSNumber)?.intValue, 12)
        XCTAssertEqual((totals["correct"] as? NSNumber)?.intValue, 9)
        XCTAssertEqual((totals["accuracy"] as? NSNumber)?.intValue, 75)
        XCTAssertEqual((totals["minutes"] as? NSNumber)?.intValue, 12)
        let modes = try XCTUnwrap(report["modes"] as? [[String: Any]])
        XCTAssertEqual(modes.first?["id"] as? String, "multiplication")
        XCTAssertFalse(log.headline(report: report, kidName: "Ari").isEmpty)
        XCTAssertTrue(log.headline(report: report, kidName: "Ari").hasPrefix("Ari practiced 12 minutes over 3 sessions"))
    }
}

