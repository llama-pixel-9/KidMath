import SwiftUI

/// The Meadow (§04–§06), behind GamFlags.meadow — iOS v1 of the web scene:
/// the earned zones side by side on one shared horizon, dragged 1:1 with the
/// finger; the hedge is a hard wall at the frontier; birds sit on their saved
/// perches; tapping one plays its call and opens its Field Guide entry; the
/// store is a separate sheet in the app's card language. Behaviour rigs,
/// ceremonies and the full §14 motion tiers follow in later ports.
///
/// Everything below is laid out in the web's DESIGN UNITS (zones are
/// 1024×588) inside one container scaled to fit, so the two platforms share
/// coordinates — and perch positions come from the shared engine.
struct MeadowView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.theme) private var theme

    private static let zoneW: CGFloat = 1024
    private static let zoneH: CGFloat = 588
    private static let hedgeW: CGFloat = 300

    @State private var flock: FlockService?
    @State private var birds: [[String: Any]] = []
    @State private var perchById: [String: Perch] = [:]
    @State private var offset: CGFloat = 0
    @State private var dragStart: CGFloat?
    @State private var activeZone = "meadow"
    @State private var bubble: Bubble?
    @State private var guideEntry: GuideEntry?
    @State private var storeOpen = false
    /// §09: the bird mid-hop or mid-signature; §10: the hatch sheet.
    @State private var hoppingSpecies: String?
    @State private var performingSpecies: String?
    @State private var hatchOpen = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    struct Perch {
        let id: String
        let zone: String
        let x: CGFloat
        let y: CGFloat
        let depth: Double
    }

    struct Bubble {
        let text: String
        let globalX: CGFloat
        let y: CGFloat
    }

    struct GuideEntry: Identifiable {
        let id: String
        let birdName: String
    }

    struct BobRig {
        let period: Double
        let delay: Double
    }

    /// §14 tier 1: the idle bob runs on the period/delay randomised at
    /// placement and SAVED, so the flock never pulses together — and never
    /// under reduce-motion or Calm mode.
    private func bobRig(_ bird: [String: Any]) -> BobRig? {
        guard GamFlags.meadowMotion, !lowMotion,
              let bob = bird["bob"] as? [String: Any] else { return nil }
        return BobRig(
            period: ProgressStore.double(bob["period"], default: 5),
            delay: ProgressStore.double(bob["delay"], default: 0)
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            GeometryReader { proxy in
                let width = min(proxy.size.width, Self.zoneW)
                let scale = width / Self.zoneW
                VStack(spacing: 0) {
                    sceneContainer(scale: scale)
                        .frame(width: width, height: Self.zoneH * scale)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .overlay(alignment: .topTrailing) { zoneChips.padding(10) }
                    handleBar
                        .frame(width: width)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(theme.background.ignoresSafeArea())
        .onAppear {
            guard let engine = app.engine else { return }
            let service = FlockService(engine: engine)
            service.ensureStarter()
            flock = service
            perchById = Self.loadPerches(engine)
            refresh()
        }
        .sheet(item: $guideEntry) { entry in
            if let species = flock?.species(entry.id) {
                FieldGuideSheet(
                    species: species,
                    awayLine: GamFlags.ceremonies && (flock?.isAway(entry.id) ?? false)
                        ? Seasons.awayLine(species.raw)
                        : nil
                )
            }
        }
        .sheet(isPresented: $storeOpen) {
            if let flock {
                GiveAHomeSheet(flock: flock, eggsEnabled: GamFlags.ceremonies) { refresh() }
            }
        }
        .sheet(isPresented: $hatchOpen) {
            if let flock, let speciesId = flock.egg()?["speciesId"] as? String,
               let species = flock.species(speciesId) {
                HatchSheet(species: species, reduceMotion: lowMotion) { name in
                    // Beat 6 — the only persistence point (§10).
                    _ = flock.hatch(name: name)
                    refresh()
                }
            }
        }
        // §09 signature scheduling: an uncommon-or-rarer bird performs 3–4
        // times a session at random ≥90s intervals. It never demands
        // attention — it simply happens whether or not anyone watches.
        .task {
            guard GamFlags.roster else { return }
            var performances = 0
            while !Task.isCancelled, performances < 4 {
                let gap = Double.random(in: 90...240)
                try? await Task.sleep(for: .seconds(gap))
                guard !Task.isCancelled, !lowMotion, performingSpecies == nil else { continue }
                let candidates = visibleBirds.compactMap { bird -> String? in
                    guard let id = bird["speciesId"] as? String,
                          let species = flock?.species(id),
                          species.tier != "common" else { return nil }
                    return id
                }
                guard let pick = candidates.randomElement() else { continue }
                performingSpecies = pick
                performances += 1
                try? await Task.sleep(for: .seconds(3))
                if performingSpecies == pick { performingSpecies = nil }
            }
        }
    }

    private func refresh() {
        birds = flock?.birds() ?? []
    }

    private static func loadPerches(_ engine: EngineBridge) -> [String: Perch] {
        var map: [String: Perch] = [:]
        for raw in (try? engine.perches()) ?? [] {
            guard let id = raw["id"] as? String else { continue }
            map[id] = Perch(
                id: id,
                zone: raw["zone"] as? String ?? "meadow",
                x: CGFloat(ProgressStore.double(raw["x"])),
                y: CGFloat(ProgressStore.double(raw["y"])),
                depth: depthValue(raw["depth"] as? String)
            )
        }
        return map
    }

    private static func depthValue(_ band: String?) -> Double {
        switch band {
        case "sky": return 0.7
        case "canopy": return 0.85
        case "foreground": return 1.15
        default: return 1.0
        }
    }

    // MARK: - Chrome

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                FeatherIcon(glyph: .close, size: 18, color: Theme.ink)
                    .padding(12)
                    .background(Circle().fill(theme.cardBackground))
                    .accessibilityLabel("close")
            }
            Text("Meadow")
                .font(theme.displayFont(size: 24))
                .foregroundStyle(Theme.ink)
            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    private var zoneIds: [String] { flock?.earnedZones().map(\.id) ?? ["meadow"] }

    private func zoneIndex(_ id: String) -> Int { zoneIds.firstIndex(of: id) ?? 0 }

    private var zoneChips: some View {
        HStack(spacing: 6) {
            ForEach(flock?.earnedZones() ?? [], id: \.id) { zone in
                Button {
                    withAnimation(.easeInOut(duration: 0.6)) {
                        offset = -CGFloat(zoneIndex(zone.id)) * Self.zoneW
                    }
                    activeZone = zone.id
                    flock?.recordViewedZone(zone.id)
                } label: {
                    Text(zone.name)
                        .font(theme.bodyFont(size: 13, weight: .bold))
                        .foregroundStyle(Theme.ink.opacity(activeZone == zone.id ? 1 : 0.6))
                        .padding(.horizontal, 11)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(.white.opacity(activeZone == zone.id ? 1 : 0.55)))
                }
            }
        }
    }

    private var handleBar: some View {
        HStack(spacing: 12) {
            Text("Field Guide")
                .font(theme.displayFont(size: 18))
                .foregroundStyle(Theme.ink)
            Text("\(birds.count) of \(flock?.species.count ?? 22) birds")
                .font(theme.bodyFont(size: 13, weight: .bold))
                .foregroundStyle(Theme.ink.opacity(0.6))
            Spacer()
            Button { storeOpen = true } label: {
                Text("Give a home")
                    .font(theme.displayFont(size: 15))
                    .foregroundStyle(Theme.cream)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 42)
                    .background(RoundedRectangle(cornerRadius: 13).fill(Theme.deepTeal).offset(y: 3))
                    .background(RoundedRectangle(cornerRadius: 13).fill(Theme.teal))
            }
            .buttonStyle(SpringButtonStyle())
        }
        .padding(.horizontal, 18)
        .frame(height: 66)
        .background(
            UnevenRoundedRectangle(bottomLeadingRadius: 24, bottomTrailingRadius: 24)
                .fill(Color(red: 1, green: 0.99, blue: 0.96))
        )
    }

    // MARK: - Scene (design units, scaled once)

    private func sceneContainer(scale: CGFloat) -> some View {
        let zones = zoneIds
        let hasFrontier = flock?.frontierZone() != nil
        let stripW = CGFloat(zones.count) * Self.zoneW + (hasFrontier ? Self.hedgeW : 0)
        let lastStop = -(CGFloat(zones.count - 1) * Self.zoneW + (hasFrontier ? Self.hedgeW : 0))

        return ZStack(alignment: .topLeading) {
            HStack(spacing: 0) {
                ForEach(zones, id: \.self) { zoneId in
                    ZoneBackdropView(
                        zoneId: zoneId,
                        nestBalance: zoneId == "meadow" ? nestBalance : nil,
                        season: season
                    )
                    .frame(width: Self.zoneW, height: Self.zoneH)
                    .overlay(alignment: .topLeading) {
                        if zoneId == "meadow", GamFlags.ceremonies, let flock, flock.egg() != nil {
                            EggSpriteView(
                                warmthPercent: flock.eggWarmthPercent(),
                                ready: flock.eggReady(),
                                speciesName: flock.species(flock.egg()?["speciesId"] as? String ?? "")?.name
                                    .split(separator: " ").last.map(String.init) ?? "Egg",
                                reduceMotion: lowMotion
                            )
                            .position(x: 460, y: 500)
                            .onTapGesture { if flock.eggReady() { hatchOpen = true } }
                        }
                    }
                }
                if let frontier = flock?.frontierZone() {
                    HedgeView(zone: frontier, remaining: max(0, frontier.unlockAt - birds.count))
                        .frame(width: Self.hedgeW, height: Self.zoneH)
                }
            }
            ForEach(Array(visibleBirds.enumerated()), id: \.offset) { _, bird in
                if let perch = perchById[bird["perchId"] as? String ?? ""],
                   let zi = zoneIds.firstIndex(of: perch.zone) {
                    let speciesId = bird["speciesId"] as? String ?? ""
                    PerchedBirdView(
                        depth: perch.depth,
                        asleep: night && !["barnOwl", "snowyOwl"].contains(speciesId),
                        bob: bobRig(bird),
                        hopping: hoppingSpecies == speciesId,
                        performing: performingSpecies == speciesId
                    )
                    .position(x: CGFloat(zi) * Self.zoneW + perch.x, y: perch.y - 46 * perch.depth * 0.44)
                    .onTapGesture { tap(bird, perch: perch, zoneIndex: zi) }
                    .accessibilityLabel("\(FlockService.birdName(bird)) the \(flock?.species(speciesId)?.name ?? "bird")")
                }
            }
            if let bubble {
                Text(bubble.text)
                    .font(theme.bodyFont(size: 15, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(Capsule().fill(Color(red: 1, green: 0.99, blue: 0.96)))
                    .position(x: bubble.globalX, y: bubble.y - 74)
            }
        }
        .frame(width: stripW, height: Self.zoneH, alignment: .topLeading)
        .offset(x: offset)
        .frame(width: Self.zoneW, height: Self.zoneH, alignment: .topLeading)
        .clipped()
        .background(Color(red: 0.79, green: 0.91, blue: 0.87))
        .overlay {
            // §12 night: a palette swap, not a redraw — Deep Teal over the
            // scene; the birds settle as silhouettes, only the owls awake.
            if night {
                Color(red: 0.05, green: 0.23, blue: 0.2).opacity(0.45).allowsHitTesting(false)
            }
        }
        .contentShape(Rectangle())
        // scaleEffect scales pixels, not layout — pin the scaled visual into
        // a frame of its VISUAL size, anchored top-leading, so the viewport
        // maths in design units maps 1:1 onto the screen.
        .scaleEffect(scale, anchor: .topLeading)
        .frame(width: Self.zoneW * scale, height: Self.zoneH * scale, alignment: .topLeading)
        .gesture(dragGesture(scale: scale, lastStop: lastStop))
    }

    private var nestBalance: Int {
        EngagementStore.starBalance(EngagementStore().load())
    }

    private var season: String? { GamFlags.ceremonies ? Seasons.current() : nil }
    private var night: Bool { GamFlags.ceremonies && Seasons.isNight() }
    private var lowMotion: Bool { reduceMotion || app.calmMode }
    private var visibleBirds: [[String: Any]] {
        // §11: an away migrant's perch stays hers and stays empty.
        guard GamFlags.ceremonies else { return birds }
        return birds.filter { !(flock?.isAway($0["speciesId"] as? String ?? "") ?? false) }
    }

    /// Free 1:1 drag across earned zones; beyond a bound the scene follows at
    /// a third of the finger capped at the 40px rubber-band; release settles
    /// to the nearest stop (§05/§14).
    private func dragGesture(scale: CGFloat, lastStop: CGFloat) -> some Gesture {
        DragGesture()
            .onChanged { value in
                if dragStart == nil { dragStart = offset }
                var next = (dragStart ?? 0) + value.translation.width / scale
                if next > 0 { next = min(40, next * 0.3) }
                if next < lastStop { next = lastStop - min(40, (lastStop - next) * 0.3) }
                offset = next
            }
            .onEnded { _ in
                dragStart = nil
                var stops = (0..<zoneIds.count).map { -CGFloat($0) * Self.zoneW }
                if flock?.frontierZone() != nil { stops.append(lastStop) }
                let nearest = stops.min { abs($0 - offset) < abs($1 - offset) } ?? 0
                withAnimation(.easeOut(duration: 0.24)) { offset = nearest }
                let index = min(zoneIds.count - 1, max(0, Int(round(-nearest / Self.zoneW))))
                activeZone = zoneIds[index]
                flock?.recordViewedZone(activeZone)
            }
    }

    private func tap(_ bird: [String: Any], perch: Perch, zoneIndex: Int) {
        guard let speciesId = bird["speciesId"] as? String,
              let species = flock?.species(speciesId) else { return }
        SoundPlayer.shared.playBirdCall()
        // §14: a rare bird answers with its signature move instead of the hop.
        if !lowMotion {
            if GamFlags.roster, ["rare", "legendary"].contains(species.tier) {
                performingSpecies = speciesId
                Task {
                    try? await Task.sleep(for: .seconds(3))
                    if performingSpecies == speciesId { performingSpecies = nil }
                }
            } else {
                hoppingSpecies = speciesId
                Task {
                    try? await Task.sleep(for: .milliseconds(250))
                    if hoppingSpecies == speciesId { hoppingSpecies = nil }
                }
            }
        }
        bubble = Bubble(
            text: "\(FlockService.birdName(bird)) · \(species.name)",
            globalX: CGFloat(zoneIndex) * Self.zoneW + perch.x,
            y: perch.y
        )
        let name = FlockService.birdName(bird)
        // §04: hop, call, then the entry opens.
        Task {
            try? await Task.sleep(for: .milliseconds(600))
            guideEntry = GuideEntry(id: speciesId, birdName: name)
            try? await Task.sleep(for: .milliseconds(700))
            bubble = nil
        }
    }
}

// MARK: - Placeholder bird sprite (rough sketch, like the web's BirdSprite)

struct BirdSpriteView: View {
    var asleep = false

    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height
            let body = asleep ? Color(red: 0.04, green: 0.18, blue: 0.16) : Theme.apricot
            let ink = asleep ? body : Theme.ink
            ZStack {
                // legs
                Path { p in
                    p.move(to: CGPoint(x: w * 0.42, y: h))
                    p.addLine(to: CGPoint(x: w * 0.44, y: h * 0.78))
                    p.move(to: CGPoint(x: w * 0.58, y: h))
                    p.addLine(to: CGPoint(x: w * 0.56, y: h * 0.78))
                }
                .stroke(ink, lineWidth: 1.6)
                // body
                Ellipse()
                    .fill(body)
                    .overlay(Ellipse().stroke(ink, lineWidth: 1.6))
                    .frame(width: w * 0.82, height: h * 0.6)
                    .position(x: w * 0.48, y: h * 0.55)
                // head
                Circle()
                    .fill(body)
                    .overlay(Circle().stroke(ink, lineWidth: 1.6))
                    .frame(width: w * 0.42)
                    .position(x: w * 0.72, y: h * 0.3)
                // beak
                Path { p in
                    p.move(to: CGPoint(x: w * 0.9, y: h * 0.26))
                    p.addLine(to: CGPoint(x: w * 1.04, y: h * 0.3))
                    p.addLine(to: CGPoint(x: w * 0.9, y: h * 0.36))
                    p.closeSubpath()
                }
                .fill(asleep ? body : Theme.sun)
                // eye
                if !asleep {
                    Circle().fill(Theme.ink)
                        .frame(width: max(2.4, w * 0.07))
                        .position(x: w * 0.78, y: h * 0.24)
                }
            }
        }
    }
}


/// One perched bird with its animation layers (§09/§14): the saved idle bob,
/// the 200ms tap hop, and a placeholder "performing" wiggle standing in for
/// the commissioned signature rigs. Sleeping birds are silhouettes.
struct PerchedBirdView: View {
    let depth: Double
    var asleep = false
    var bob: MeadowView.BobRig?
    var hopping = false
    var performing = false

    @State private var bobbing = false
    @State private var performPhase = false

    var body: some View {
        let size = 46 * depth
        BirdSpriteView(asleep: asleep)
            .frame(width: size, height: size * 0.87)
            .rotationEffect(.degrees(performing ? (performPhase ? 8 : -8) : (hopping ? 2 : 0)))
            .offset(y: yOffset)
            .animation(.spring(duration: 0.2), value: hopping)
            .animation(.easeInOut(duration: 0.3), value: performPhase)
            .onAppear {
                if let bob {
                    withAnimation(
                        .easeInOut(duration: bob.period / 2)
                        .repeatForever(autoreverses: true)
                        .delay(bob.delay)
                    ) { bobbing = true }
                }
            }
            .onChange(of: performing) { _, now in
                guard now else { return }
                Task {
                    for _ in 0..<8 where performing {
                        performPhase.toggle()
                        try? await Task.sleep(for: .milliseconds(320))
                    }
                    performPhase = false
                }
            }
    }

    private var yOffset: CGFloat {
        if hopping { return -14 }
        if performing { return performPhase ? -22 : -6 }
        return bobbing ? -5 : 0
    }
}
