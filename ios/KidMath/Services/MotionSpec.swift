import Foundation

/// §14 on iOS — the motion table's values, mirrored from the web's
/// src/engagement/meadow/motionSpec.js (which is locked verbatim by its spec
/// test). Views take their durations from here, never from inline literals,
/// so a tuning change happens in one place per platform.
///
/// Reduced motion (OS setting or Calm mode): tier 1 off, tier 2 becomes a
/// short opacity fade with no movement, tier 3 becomes a still frame with the
/// same copy. Nothing is hidden.
enum MotionSpec {
    // Tier 1 · ambient
    static let idleBobRiseY: Double = -5
    static let signatureMinGapS: Double = 90
    static let signatureMaxGapS: Double = 240
    static let signaturesPerSession = 4
    static let playVisitMinGapS: Double = 120
    static let playVisitMaxGapS: Double = 300

    // Tier 2 · response
    static let tapHopMs = 200
    static let tapHopRiseY: Double = -14
    static let callBubbleInMs = 160
    static let callBubbleHoldMs = 900
    static let callBubbleOutMs = 200
    static let zonePanChipMs = 600
    static let zonePanSettleMs = 240
    static let rubberBandPx: Double = 40

    // Tier 3 · ceremony (one at a time; stars land first)
    static let starsPerStarMs = 600
    static let starsStaggerMs = 40
    static let starsSpriteCap = 14
    static let nestCountUpMs = 800
    static let birdArrivesMs = 1200
    static let nameBubbleHoldMs = 2000
    static let departureMs = 3000
    static let reducedMotionFadeMs = 120
}
