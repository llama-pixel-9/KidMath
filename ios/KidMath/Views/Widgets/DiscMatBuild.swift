import SwiftUI
import UIKit

/// The tappable disc mat — build mode of the placeValueDiscs answer widget
/// (`display.mode == "build"`). The kid edits a copy of the start mat: add or
/// take away discs, trade 10 of a place for 1 of the next bigger place, or
/// break 1 into 10 of the next smaller place. The answer is the number the
/// finished mat shows, submitted as an Int through the same `submit` path the
/// read mode's digit pad uses (the engine's checkAnswer scores placeValueDiscs
/// numerically, so nothing changes there).
///
/// `DiscMatBuild` is the pure state — the Swift twin of
/// src/components/discMatBuild.js: same cap, same rules, same strings.
/// Change a rule or a string in both places.

// MARK: - State

struct DiscMatBuild: Equatable {
    /// The most discs one place may hold — the most any Grade 2 step needs:
    /// 9 + 9 = 18, or 9 ones plus the 10 from a broken ten = 19 (DISC_CAP).
    static let cap = 19
    /// The places a mat may use, biggest first (PLACES).
    static let places = [1000, 100, 10, 1]

    struct Column: Equatable {
        let place: Int
        var count: Int
    }

    /// One column per place, biggest place first, places contiguous.
    private(set) var columns: [Column]
    /// The mat the question started from — what Start over goes back to.
    let start: [Column]

    /// startMat: keeps only real places (1000/100/10/1; the first of a
    /// repeated place wins), biggest first, each count clamped to 0...cap. A
    /// skipped place in between (100 and 1 with no 10) comes back with 0
    /// discs, so a trade always goes to the place exactly 10 times bigger.
    /// With no usable place at all the kid still gets a mat to build on: an
    /// empty hundreds, tens and ones.
    init(columns: [Column]) {
        var counts: [Int: Int] = [:]
        for column in columns where Self.places.contains(column.place) && counts[column.place] == nil {
            counts[column.place] = min(max(column.count, 0), Self.cap)
        }
        let present = Self.places.filter { counts[$0] != nil }
        var clean = [100, 10, 1].map { Column(place: $0, count: 0) }
        if let first = present.first, let last = present.last,
           let from = Self.places.firstIndex(of: first), let to = Self.places.firstIndex(of: last) {
            clean = Self.places[from...to].map { Column(place: $0, count: counts[$0] ?? 0) }
        }
        self.columns = clean
        self.start = clean
    }

    /// From `display.cols` — `[{place, count}]`. Numbers cross the bridge as
    /// NSNumber; numeric strings ("100") are read like the web's Number(). A
    /// column whose place is not exactly 1000/100/10/1 is dropped; a count is
    /// truncated (Math.trunc), and an unreadable count is 0.
    init(cols: [[String: Any]]) {
        let parsed: [Column] = cols.compactMap { col in
            guard let raw = Self.number(col["place"]),
                  let place = Self.places.first(where: { Double($0) == raw }) else { return nil }
            let count = (Self.number(col["count"]) ?? 0).rounded(.towardZero)
            return Column(place: place, count: Int(min(max(count, 0), Double(Self.cap))))
        }
        self.init(columns: parsed)
    }

    /// A finite number from an NSNumber or a numeric string; nil otherwise.
    static func number(_ value: Any?) -> Double? {
        if let n = value as? NSNumber {
            let d = n.doubleValue
            return d.isFinite ? d : nil
        }
        if let s = value as? String,
           let d = Double(s.trimmingCharacters(in: .whitespacesAndNewlines)), d.isFinite {
            return d
        }
        return nil
    }

    /// matValue: the number the mat shows, Σ place × count.
    var matValue: Int {
        columns.reduce(0) { $0 + $1.place * $1.count }
    }

    /// sameMat(mat, start): Start over has nothing to undo.
    var isAtStart: Bool { columns == start }

    // MARK: Rules

    func canAdd(_ i: Int) -> Bool {
        columns.indices.contains(i) && columns[i].count < Self.cap
    }

    func canRemove(_ i: Int) -> Bool {
        columns.indices.contains(i) && columns[i].count > 0
    }

    /// 10 of this place for 1 of the next bigger place (the one to its left),
    /// unless that place is already at the cap.
    func canTradeUp(_ i: Int) -> Bool {
        columns.indices.contains(i) && i > 0
            && columns[i].count >= 10
            && columns[i - 1].count < Self.cap
    }

    /// 1 of this place for 10 of the next smaller place (the one to its
    /// right), unless that would push the smaller place past the cap.
    func canBreakDown(_ i: Int) -> Bool {
        columns.indices.contains(i) && i + 1 < columns.count
            && columns[i].count >= 1
            && columns[i + 1].count + 10 <= Self.cap
    }

    /// A number writes one digit per place, so Check waits until every place
    /// holds 9 or fewer.
    var canCheck: Bool {
        !columns.isEmpty && columns.allSatisfy { $0.count <= 9 }
    }

    // MARK: Actions (a move the rules don't allow leaves the mat unchanged)

    mutating func add(_ i: Int) {
        guard canAdd(i) else { return }
        columns[i].count += 1
    }

    mutating func remove(_ i: Int) {
        guard canRemove(i) else { return }
        columns[i].count -= 1
    }

    mutating func tradeUp(_ i: Int) {
        guard canTradeUp(i) else { return }
        columns[i].count -= 10
        columns[i - 1].count += 1
    }

    mutating func breakDown(_ i: Int) {
        guard canBreakDown(i) else { return }
        columns[i].count -= 1
        columns[i + 1].count += 10
    }

    mutating func startOver() {
        columns = start
    }

    // MARK: Status line

    /// overfullPlace: the INDEX of the column the status line talks about, or
    /// nil when no place holds 10 or more. The smallest place that can trade
    /// up comes first (trade the ones, then the tens they made); when none
    /// can, the biggest overfull place, which only taking discs away fixes.
    var overfullPlace: Int? {
        for i in columns.indices.reversed() where columns[i].count >= 10 && canTradeUp(i) {
            return i
        }
        return columns.firstIndex { $0.count >= 10 }
    }

    /// "The ones have 12 discs. Trade 10 ones for 1 ten." — or, when no trade
    /// can fix it, "The hundreds have 10 discs. Take some discs away." Nil
    /// (the web's "") when the mat can be checked. Never a dead end.
    var statusLine: String? {
        guard let i = overfullPlace else { return nil }
        let column = columns[i]
        let lead = "The \(Self.placeName(column.place)) have \(column.count) discs."
        if canTradeUp(i) {
            return "\(lead) Trade 10 \(Self.placeName(column.place)) for 1 \(Self.placeName(columns[i - 1].place, count: 1))."
        }
        return "\(lead) Take some discs away."
    }

    // MARK: Words

    /// "ten" / "tens": a place's name, singular for exactly one.
    static func placeName(_ place: Int, count: Int = 2) -> String {
        let names: (one: String, many: String)
        switch place {
        case 1000: names = ("thousand", "thousands")
        case 100: names = ("hundred", "hundreds")
        case 10: names = ("ten", "tens")
        case 1: names = ("one", "ones")
        default: return "\(place)"
        }
        return count == 1 ? names.one : names.many
    }

    /// "Add a one disc"
    static func addLabel(_ place: Int) -> String {
        "Add a \(placeName(place, count: 1)) disc"
    }

    /// "Take away a ten disc"
    static func removeLabel(_ place: Int) -> String {
        "Take away a \(placeName(place, count: 1)) disc"
    }

    /// "10 ones → 1 ten" — button text on the column the discs come from.
    static func tradeUpText(_ place: Int) -> String {
        "10 \(placeName(place)) → 1 \(placeName(place * 10, count: 1))"
    }

    /// "Trade 10 ones for 1 ten"
    static func tradeUpLabel(_ place: Int) -> String {
        "Trade 10 \(placeName(place)) for 1 \(placeName(place * 10, count: 1))"
    }

    /// "1 ten → 10 ones"
    static func breakDownText(_ place: Int) -> String {
        "1 \(placeName(place, count: 1)) → 10 \(placeName(place / 10))"
    }

    /// "Trade 1 hundred for 10 tens"
    static func breakDownLabel(_ place: Int) -> String {
        "Trade 1 \(placeName(place, count: 1)) for 10 \(placeName(place / 10))"
    }

    /// What VoiceOver hears for a column's discs: "4 one discs", "1 hundred
    /// disc", "No ten discs" — counts per place, never the number itself.
    static func discCountLabel(place: Int, count: Int) -> String {
        if count == 0 { return "No \(placeName(place, count: 1)) discs" }
        return "\(count) \(placeName(place, count: 1)) disc\(count == 1 ? "" : "s")"
    }

    /// After a submit: "The mat shows 921." (correct) / "Your mat shows 911."
    /// Plain digits, no thousands separator, like the mode's prompts.
    static func feedbackLine(value: Int, correct: Bool) -> String {
        correct ? "The mat shows \(value)." : "Your mat shows \(value)."
    }
}

// MARK: - View

/// The build-mode mat: a row of place cards (word on top, discs in rows of
/// five), and under each card its − / + keys and trade buttons; then one
/// status line, then Start over and Check. No running number while the kid
/// builds — reading the mat is part of the skill. Re-created per question by
/// SessionView's `.id(viewModel.questionKey)`, which is what resets the mat.
struct DiscMatBuildView: View {
    @Environment(\.theme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let disabled: Bool
    /// Session feedback: true correct, false wrong, nil while building.
    let feedback: Bool?
    /// The app's calm mode; with Reduce Motion it turns the disc animation off.
    let calmMode: Bool
    let submit: (Any) -> Void

    @State private var mat: DiscMatBuild
    /// The value sent on Check — the feedback line reads it back.
    @State private var submitted: Int? = nil

    /// − / + keys: the kit's pad-key floor (DigitPadView keys are 52pt).
    private static let stepHeight: CGFloat = 52
    /// Trade buttons and Start over: the 44pt touch minimum.
    private static let tradeHeight: CGFloat = 44
    private static let columnSpacing: CGFloat = 6

    init(cols: [[String: Any]], disabled: Bool, feedback: Bool?, calmMode: Bool = false, submit: @escaping (Any) -> Void) {
        self.disabled = disabled
        self.feedback = feedback
        self.calmMode = calmMode
        self.submit = submit
        _mat = State(initialValue: DiscMatBuild(cols: cols))
    }

    private var lowMotion: Bool { reduceMotion || calmMode }
    private var locked: Bool { disabled || feedback != nil }

    var body: some View {
        VStack(spacing: 10) {
            // The mat: one card per place. The cards row and the controls row
            // hold the same number of equally flexible columns with the same
            // spacing, so each control stack sits right under its card.
            HStack(alignment: .top, spacing: Self.columnSpacing) {
                ForEach(Array(mat.columns.enumerated()), id: \.offset) { _, column in
                    placeCard(column)
                }
            }
            .overlay {
                // kit feedbackRing: Lark Teal when correct, Ember when wrong.
                if let feedback {
                    RoundedRectangle(cornerRadius: 15)
                        .stroke(feedback ? theme.correct : theme.wrong, lineWidth: 4)
                        .padding(-3)
                        .accessibilityHidden(true)
                }
            }

            HStack(alignment: .top, spacing: Self.columnSpacing) {
                ForEach(Array(mat.columns.enumerated()), id: \.offset) { index, column in
                    VStack(spacing: 8) {
                        stepper(index, column)
                        tradeSlots(index, column)
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            messageLine

            HStack(spacing: 16) {
                Button {
                    act { $0.startOver() }
                } label: {
                    Text("Start over")
                        .font(theme.displayFont(size: 16))
                        .foregroundStyle(Theme.teal)
                        .padding(.horizontal, 12)
                        .frame(minHeight: Self.tradeHeight)
                        .contentShape(Rectangle())
                        .opacity(startOverEnabled ? 1 : 0.4)
                }
                .buttonStyle(SpringButtonStyle())
                .disabled(!startOverEnabled)
                .accessibilityLabel("Start over")

                CheckButton(enabled: !locked && mat.canCheck) { check() }
                    .accessibilityLabel("Check")
            }
        }
        .disabled(locked)
        .frame(maxWidth: 400)
        .onChange(of: mat.statusLine) { _, line in
            // The web's aria-live="polite" status line.
            if let line { UIAccessibility.post(notification: .announcement, argument: line) }
        }
    }

    private var startOverEnabled: Bool { !locked && !mat.isAtStart }

    // MARK: Place card

    private func placeCard(_ column: DiscMatBuild.Column) -> some View {
        VStack(spacing: 4) {
            Text(DiscMatBuild.placeName(column.place))
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(theme.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            DiscRowsLayout(maxDisc: 28) {
                ForEach(0..<column.count, id: \.self) { _ in
                    disc(column.place)
                        .transition(discTransition)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(DiscMatBuild.discCountLabel(place: column.place, count: column.count))
        }
        .padding(4)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 12).fill(theme.cardBackground))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(DiscMatBuild.placeName(column.place))
    }

    /// Same tint and Ink label as the read mat (PlaceValueDiscs.jsx), the
    /// label sized to the disc.
    private func disc(_ place: Int) -> some View {
        Circle()
            .fill(Self.tint(place).fill)
            .overlay {
                GeometryReader { proxy in
                    Text(verbatim: "\(place)")
                        .font(.system(size: min(11, max(6, proxy.size.width * Self.labelScale(place))), weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .frame(width: proxy.size.width, height: proxy.size.height)
                }
            }
    }

    /// Label size as a share of the disc: more digits, smaller type.
    private static func labelScale(_ place: Int) -> CGFloat {
        switch place {
        case 1000: return 0.3
        case 100: return 0.38
        case 10: return 0.46
        default: return 0.55
        }
    }

    private var discTransition: AnyTransition {
        lowMotion ? .identity : .scale(scale: 0.5).combined(with: .opacity)
    }

    // MARK: Controls under a card

    /// − on the left, + on the right, half the column each; stacked (+ on
    /// top) when a four-place mat makes the column too narrow for two 44pt
    /// keys side by side.
    private func stepper(_ i: Int, _ column: DiscMatBuild.Column) -> some View {
        let minus = stepKey(
            "minus", place: column.place,
            enabled: !locked && mat.canRemove(i),
            label: DiscMatBuild.removeLabel(column.place)
        ) { act { $0.remove(i) } }
        let plus = stepKey(
            "plus", place: column.place,
            enabled: !locked && mat.canAdd(i),
            label: DiscMatBuild.addLabel(column.place)
        ) { act { $0.add(i) } }
        return ViewThatFits(in: .horizontal) {
            HStack(spacing: 4) {
                minus
                plus
            }
            VStack(spacing: 8) {
                plus
                minus
            }
        }
    }

    /// Break down first (on every place with a smaller place to its right;
    /// always shown, disabled when it can't run), then trade up (shown only
    /// when it can run). A hidden slot keeps its height, so Check never moves
    /// when a trade button appears.
    @ViewBuilder
    private func tradeSlots(_ i: Int, _ column: DiscMatBuild.Column) -> some View {
        let last = mat.columns.count - 1
        let used: Int = (i < last ? 1 : 0) + (i > 0 ? 1 : 0)
        VStack(spacing: 8) {
            if i < last {
                tradeKey(
                    DiscMatBuild.breakDownText(column.place),
                    label: DiscMatBuild.breakDownLabel(column.place),
                    enabled: !locked && mat.canBreakDown(i)
                ) { act { $0.breakDown(i) } }
            }
            if i > 0 {
                if mat.canTradeUp(i) {
                    tradeKey(
                        DiscMatBuild.tradeUpText(column.place),
                        label: DiscMatBuild.tradeUpLabel(column.place),
                        enabled: !locked
                    ) { act { $0.tradeUp(i) } }
                } else {
                    slotPlaceholder
                }
            }
            ForEach(0..<max(0, tradeSlotCount - used), id: \.self) { _ in
                slotPlaceholder
            }
        }
    }

    /// The most trade buttons any column can show: 2 on a middle place of a
    /// 3+ place mat, 1 on a two-place mat.
    private var tradeSlotCount: Int {
        let n = mat.columns.count
        if n >= 3 { return 2 }
        return n == 2 ? 1 : 0
    }

    private var slotPlaceholder: some View {
        Color.clear
            .frame(height: Self.tradeHeight + 4)
            .accessibilityHidden(true)
    }

    // MARK: Keys

    /// The place's tint and pressed edge, from the kit's key pairs
    /// (DigitPadView.keyTint) — the same four tints the discs wear.
    static func tint(_ place: Int) -> (fill: Color, edge: Color) {
        switch place {
        case 1000: return DigitPadView.keyTint("7") // Apricot
        case 100: return DigitPadView.keyTint("1")  // Seafoam
        case 10: return DigitPadView.keyTint("4")   // Teal Mid
        default: return DigitPadView.keyTint("0")   // Sun Light
        }
    }

    /// A pad key (DigitPadView's look) in the column's tint, Ink glyph.
    private func stepKey(_ systemImage: String, place: Int, enabled: Bool, label: String, action: @escaping () -> Void) -> some View {
        let tint = Self.tint(place)
        return Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 20, weight: .heavy))
                .foregroundStyle(Theme.ink)
                .frame(minWidth: 44, maxWidth: .infinity, minHeight: Self.stepHeight)
                .background(RoundedRectangle(cornerRadius: 14).fill(tint.edge).offset(y: 4))
                .background(RoundedRectangle(cornerRadius: 14).fill(tint.fill))
                .opacity(enabled ? 1 : 0.4)
        }
        .buttonStyle(SpringButtonStyle())
        .disabled(!enabled)
        .accessibilityLabel(label)
    }

    /// The app's secondary button (web BTN_SECONDARY): white, Lark Teal
    /// Fredoka label, a 4pt Ink-10% bottom edge. The label is one line when
    /// it fits, else it breaks only after the arrow ("1 ten →" / "10 ones"),
    /// never inside a side — same as the web.
    private func tradeKey(_ title: String, label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            ViewThatFits(in: .horizontal) {
                tradeText(title, lines: 1)
                tradeText(title.replacingOccurrences(of: "→ ", with: "→\n"), lines: 2)
            }
            .foregroundStyle(Theme.teal)
            .padding(.horizontal, 4)
            .frame(maxWidth: .infinity)
            .frame(height: Self.tradeHeight)
            .background(RoundedRectangle(cornerRadius: 14).fill(Theme.ink.opacity(0.1)).offset(y: 4))
            .background(RoundedRectangle(cornerRadius: 14).fill(Color.white))
            .opacity(enabled ? 1 : 0.4)
        }
        .buttonStyle(SpringButtonStyle())
        .disabled(!enabled)
        .accessibilityLabel(label)
        .padding(.bottom, 4) // room for the edge, so slots line up with placeholders
    }

    private func tradeText(_ text: String, lines: Int) -> some View {
        Text(text)
            .font(theme.displayFont(size: 13))
            .multilineTextAlignment(.center)
            .lineLimit(lines)
            .minimumScaleFactor(lines == 1 ? 1 : 0.7)
    }

    // MARK: Message line

    /// After Check: the value read back (Deep Teal / Ember). While a place
    /// holds 10+: the one status line (Ink). Otherwise blank — the height is
    /// kept so Check never moves.
    private var messageLine: some View {
        let text: String
        let color: Color
        if let feedback, let submitted {
            text = DiscMatBuild.feedbackLine(value: submitted, correct: feedback)
            color = feedback ? Theme.deepTeal : Theme.ember
        } else if let status = mat.statusLine {
            text = status
            color = Theme.ink
        } else {
            text = " "
            color = Theme.ink
        }
        // One line when it fits; a two-sentence status breaks between the
        // sentences ("The tens have 19 discs." / "Trade 10 tens for 1
        // hundred."), like the web's balanced line.
        return ViewThatFits(in: .horizontal) {
            messageText(text, lines: 1)
            messageText(text.replacingOccurrences(of: ". ", with: ".\n"), lines: nil)
        }
        .foregroundStyle(color)
        .frame(maxWidth: .infinity, minHeight: 40)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
        .accessibilityHidden(text == " ")
    }

    private func messageText(_ text: String, lines: Int?) -> some View {
        Text(text)
            .font(theme.bodyFont(size: 14, weight: .bold))
            .multilineTextAlignment(.center)
            .lineLimit(lines)
            .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: Actions

    private func act(_ change: (inout DiscMatBuild) -> Void) {
        guard !locked else { return }
        withAnimation(lowMotion ? nil : .easeOut(duration: 0.15)) {
            change(&mat)
        }
    }

    private func check() {
        guard !locked, mat.canCheck else { return }
        let value = mat.matValue
        submitted = value
        submit(value)
    }
}

// MARK: - Disc rows

/// Rows of five discs sized to the card, so 5 and 10 are easy to see (two
/// full rows are a ten; a wider gap after row two keeps that ten together).
/// Always four rows tall — room for the 19-disc cap — so the mat never
/// changes height and the keys never move under the kid's finger. The disc
/// is the card's width / 5 (less the gaps), at most `maxDisc`.
struct DiscRowsLayout: Layout {
    var maxDisc: CGFloat = 28
    var minDisc: CGFloat = 10
    var perRow = 5
    var rows = 4
    var gap: CGFloat = 2
    /// The gap after row two (2pt + an extra 6pt).
    var tenGap: CGFloat = 8

    private func rowWidth(disc d: CGFloat) -> CGFloat {
        d * CGFloat(perRow) + gap * CGFloat(perRow - 1)
    }

    private func disc(for width: CGFloat) -> CGFloat {
        let fit = (width - gap * CGFloat(perRow - 1)) / CGFloat(perRow)
        return max(minDisc, min(maxDisc, fit))
    }

    private func height(disc d: CGFloat) -> CGFloat {
        d * CGFloat(rows) + gap * CGFloat(max(0, rows - 2)) + (rows > 1 ? tenGap : 0)
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let ideal = rowWidth(disc: maxDisc)
        let width = min(max(proposal.width ?? ideal, rowWidth(disc: minDisc)), ideal)
        return CGSize(width: width, height: height(disc: disc(for: width)))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let d = disc(for: bounds.width)
        let x0 = bounds.minX + (bounds.width - rowWidth(disc: d)) / 2
        for (index, subview) in subviews.enumerated() {
            let row = index / perRow
            let col = index % perRow
            let y = bounds.minY + CGFloat(row) * (d + gap) + (row >= 2 ? tenGap - gap : 0)
            subview.place(
                at: CGPoint(x: x0 + CGFloat(col) * (d + gap), y: y),
                anchor: .topLeading,
                proposal: ProposedViewSize(width: d, height: d)
            )
        }
    }
}
