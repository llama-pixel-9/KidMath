import SwiftUI

/// Seasons (§12) — Swift mirror of src/engagement/seasons.js. The season
/// follows the device calendar by quarter and changes exactly three things:
/// the canopy/ground tint, one particle, and which visitor is in the store.
/// Night is a palette swap after 7pm (9pm in summer); birds and interface
/// never retint.
enum Seasons {

    nonisolated static func current(_ date: Date = Date()) -> String {
        switch Calendar.current.component(.month, from: date) {
        case 3...5: return "spring"
        case 6...8: return "summer"
        case 9...11: return "autumn"
        default: return "winter"
        }
    }

    nonisolated static func isNight(_ date: Date = Date()) -> Bool {
        let hour = Calendar.current.component(.hour, from: date)
        let nightAt = current(date) == "summer" ? 21 : 19
        return hour >= nightAt || hour < 6
    }

    /// Species presence from the roster's `seasons` list (nil = resident).
    nonisolated static func presentNow(_ speciesRaw: [String: Any], date: Date = Date()) -> Bool {
        guard let seasons = speciesRaw["seasons"] as? [String] else { return true }
        return seasons.contains(current(date))
    }

    /// "Away · back in winter" — the kind chip on an away bird (§11).
    nonisolated static func awayLine(_ speciesRaw: [String: Any]) -> String? {
        guard let seasons = speciesRaw["seasons"] as? [String], let first = seasons.first else { return nil }
        return "Away · back in \(first)"
    }

    nonisolated static let order = ["spring", "summer", "autumn", "winter"]

    nonisolated static func previous(_ season: String) -> String {
        let index = order.firstIndex(of: season) ?? 0
        return order[(index + 3) % 4]
    }

    /// "2026-autumn" — the key departure/return events are remembered under
    /// (mirror of seasonKeyForDate in src/engagement/seasons.js).
    nonisolated static func seasonKey(_ date: Date = Date()) -> String {
        "\(Calendar.current.component(.year, from: date))-\(current(date))"
    }

    struct MigrationEvents {
        let departures: [String]
        let returns: [String]
        let key: String
    }

    /// §11 events on Meadow open, derived from the calendar + seen-marks: a
    /// departure is due when an OWNED migrant was here last season and is
    /// gone now (send-off unseen); a return when she is back and the arrival
    /// hasn't played. Away birds keep their perch and count toward everything.
    nonisolated static func migrationEvents(
        state: [String: Any],
        ownedSpecies: [(id: String, raw: [String: Any])],
        date: Date = Date()
    ) -> MigrationEvents {
        let season = current(date)
        let key = seasonKey(date)
        let departuresSeen = state["departuresSeen"] as? [String: Any] ?? [:]
        let returnsSeen = state["returnsSeen"] as? [String: Any] ?? [:]
        var departures: [String] = []
        var returns: [String] = []
        for species in ownedSpecies {
            guard let seasons = species.raw["seasons"] as? [String] else { continue }
            let here = seasons.contains(season)
            let wasHere = seasons.contains(previous(season))
            if !here, wasHere, departuresSeen[species.id] as? String != key { departures.append(species.id) }
            if here, !wasHere, returnsSeen[species.id] as? String != key { returns.append(species.id) }
        }
        return MigrationEvents(departures: departures, returns: returns, key: key)
    }

    /// Canopy/ground tints per season (the §12 hexes). `nil` season (flag
    /// off) keeps the base palette.
    struct Tint {
        let sky: Color
        let farGrass: Color
        let ground: Color
        let groundDeep: Color
        let canopy: Color
        let frozen: Bool
    }

    nonisolated static func tint(for season: String?) -> Tint {
        switch season {
        case "spring":
            return Tint(
                sky: Color(red: 0.79, green: 0.91, blue: 0.87),
                farGrass: Color(hexValue: 0x7FCFBE),
                ground: Color(hexValue: 0x7FCFBE).opacity(0.85),
                groundDeep: Color(hexValue: 0x8FD9C8),
                canopy: Color(hexValue: 0x8FD9C8),
                frozen: false
            )
        case "summer":
            return Tint(
                sky: Color(red: 0.79, green: 0.91, blue: 0.87),
                farGrass: Color(hexValue: 0x6FC3B2),
                ground: Color(hexValue: 0x6FC3B2).opacity(0.85),
                groundDeep: Color(hexValue: 0x3E9E8E),
                canopy: Color(hexValue: 0x3E9E8E),
                frozen: false
            )
        case "autumn":
            return Tint(
                sky: Color(red: 0.79, green: 0.91, blue: 0.87),
                farGrass: Color(hexValue: 0xF0A47A),
                ground: Color(hexValue: 0xF0A47A).opacity(0.85),
                groundDeep: Color(hexValue: 0xF26B3A),
                canopy: Color(hexValue: 0xF26B3A),
                frozen: false
            )
        case "winter":
            return Tint(
                sky: Color(hexValue: 0xDCEDF2),
                farGrass: Color(hexValue: 0xD8E5DF),
                ground: Color(hexValue: 0xFFFBEB),
                groundDeep: Color(hexValue: 0xCBDDD6),
                canopy: Color(hexValue: 0xB9CFC9),
                frozen: true
            )
        default:
            return Tint(
                sky: Color(red: 0.79, green: 0.91, blue: 0.87),
                farGrass: Color(red: 0.56, green: 0.82, blue: 0.75),
                ground: Color(red: 0.65, green: 0.87, blue: 0.83),
                groundDeep: Color(red: 0.5, green: 0.81, blue: 0.75),
                canopy: Color(red: 0.44, green: 0.76, blue: 0.7),
                frozen: false
            )
        }
    }
}

private extension Color {
    init(hexValue: UInt32) {
        self.init(
            red: Double((hexValue >> 16) & 0xFF) / 255,
            green: Double((hexValue >> 8) & 0xFF) / 255,
            blue: Double(hexValue & 0xFF) / 255
        )
    }
}
