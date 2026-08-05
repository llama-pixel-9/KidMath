import SwiftUI

/// The auto-renewal disclosure — Swift mirror of `src/legal/disclosures.js`.
/// Keep the wording identical: the literal string shown beside the checkbox
/// is what the web side stores as consent evidence, and the two platforms
/// must show the same terms.
///
/// State auto-renewal statutes require, before any purchase step: that the
/// subscription auto-renews until cancelled; the trial length AND the actual
/// end date rendered as a date; the exact first-charge amount AND date; and
/// the renewal frequency and amount. The checkbox must NEVER start ticked —
/// California requires the auto-renewal consent to be its own affirmative
/// act, separate from Terms acceptance.
enum AutoRenewalTerms {
    static let trialDays = 14

    static func trialEndDate(from now: Date = Date()) -> Date {
        Calendar.current.date(byAdding: .day, value: trialDays, to: now) ?? now
    }

    /// "August 19, 2026" — a real date, never a relative phrase.
    static func formatted(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "MMMM d, yyyy"
        return formatter.string(from: date)
    }

    /// `price` is the localized display price (e.g. "$54.99"), `period` is
    /// "year" or "month".
    static func label(price: String, period: String, now: Date = Date()) -> String {
        let endsOn = formatted(trialEndDate(from: now))
        return "I understand that my \(trialDays)-day free trial ends on \(endsOn), "
            + "that my payment method will then be charged \(price) on \(endsOn), "
            + "and that my subscription automatically renews at \(price) per \(period) until I cancel."
    }
}

/// The separate, never-pre-ticked auto-renewal checkbox. Callers disable
/// their purchase buttons until `ack` is true.
struct AutoRenewalConsentBox: View {
    @Environment(\.theme) private var theme
    @Binding var ack: Bool
    let label: String

    var body: some View {
        Button {
            ack.toggle()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: ack ? "checkmark.square.fill" : "square")
                    .font(.system(size: 22))
                    .foregroundStyle(ack ? Theme.teal : theme.textMuted)
                Text(label)
                    .font(theme.bodyFont(size: 13))
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Auto-renewal agreement: \(label)")
        .accessibilityValue(ack ? "checked" : "unchecked")
    }
}
