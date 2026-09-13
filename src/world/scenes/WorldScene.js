import Phaser from "phaser";
import { REGIONS, regionAtX, regionById, SEA_LEFT_W, WORLD_H, clampToGround } from "../regions";
import { ZONES } from "../zones/index";
import {
  loadWorldState,
  persistWorldState,
  applyQuestComplete,
  applyReceiveEgg,
  petStage,
  applyCollectFeather,
  applyBuyDecoration,
  applyPlantSeed,
  applyHarvestFlower,
  seedStage,
  todayKey,
  availableQuests,
  questDone,
  fixtureOn,
  applyDiscover,
  applyLastRegion,
  applyTutorialDone,
  applySecretFound,
  applyVisitorHelped,
  applyMigrationDone,
} from "../worldStore";
import { groupPlayed } from "../mastery/masteryModel";
import { birdSize } from "../worldArt";
import { sfx } from "../worldAudio";
import { buildTerrain, updateTerrain, worldRects } from "../engine/terrain";
import { buildAmbient, updateAmbient, destroyAmbient } from "../engine/ambient";
import { buildMist } from "../engine/mist";
import { createAvatar, createFollower } from "../engine/avatar";
import { setupCamera } from "../engine/cameraRig";
import { buildNpcs } from "../engine/npcs";
import { buildBridge } from "../engine/fixtures/bridge";
import { buildFeeder } from "../engine/fixtures/feeder";
import { buildNests } from "../engine/fixtures/nests";
import { buildGate } from "../engine/fixtures/gate";
import { buildChicks } from "../engine/fixtures/chicks";
import { buildHome } from "../engine/fixtures/home";
import { buildFeathers } from "../engine/fixtures/feathers";
import { buildSeedPlot } from "../engine/fixtures/seedPlot";
import { buildSignpost } from "../engine/fixtures/signpost";
import { hitZone, toWorld } from "../engine/fixtures/common";
import { buildReactive } from "../engine/reactive";
import { startTutorial } from "../engine/tutorial";
import { buildSecrets, SECRET_COUNT } from "../engine/secrets";
import { startLife } from "../engine/life";
import { applySeason, destroySeasonal } from "../engine/seasonal";
import { visitorForDate, visitorQuest, VISITOR_SPOT } from "../engine/visitor";
import { seasonForDate } from "../../engagement/seasons.js";
import { MIGRATION_STOPS, migrationSpot, migrationQuest } from "../engine/migration";
import { music } from "../worldMusic";
import { QuestRunner } from "../engine/questRunner";
import { sparkle, DEPTH } from "../engine/juice";

const TAP_SLOP = 12;

/**
 * Skylark Island. One continuous world: the skylark hops and flies along the
 * ground band, birds offer quests whose math is the world interaction,
 * fixed things stay fixed, gates open the mist to the next region, and the
 * home nest keeps the egg warm. The DOM layer (WorldPage) draws dialog,
 * HUD and panels; the two talk over game.events.
 */
export default class WorldScene extends Phaser.Scene {
  constructor() {
    super("world");
  }

  init(data) {
    this.worldData = data ?? {};
    this.world = loadWorldState();
    this.practiceStars = this.worldData.practiceStars ?? 0;
    this.byMode = this.worldData.byMode ?? {};
    this.override = this.worldData.override ?? null;
    this.fixtures = {};
    this.npcs = {};
    this.signposts = {};
    this.mists = {};
    this.currentRegionId = null;
    this.inputLocked = false;
    this.pointerConsumed = false;
    this.petStageShown = undefined;
    this.follower = null;
  }

  // ------------------------------------------------------------------ setup

  create() {
    this.discovered = this.computeDiscovered();
    this.terrain = buildTerrain(this);
    this.calm = Boolean(this.worldData.calm);
    this.ambient = buildAmbient(this, { mode: this.worldData.timeOfDay ?? "day", calm: this.calm });
    this.reactive = buildReactive(this, this.terrain);
    this.seasonal = this.calm ? null : applySeason(this, this.terrain, this.worldData.season ?? seasonForDate(new Date()));
    this.featherHandles = {};
    this.lastInputAt = 0;

    for (const region of REGIONS) {
      const zone = ZONES[region.id];
      if (!zone) continue;
      this.buildZone(zone, region);
      if (!this.discovered.has(region.id)) {
        this.mists[region.id] = buildMist(this, region);
        this.npcs[region.id]?.hideAll();
      }
    }
    this.secrets = buildSecrets(this, [...this.world.secrets], (id) => this.onSecretFound(id));
    this.buildVisitor();
    this.life = startLife(this, {
      npcsFor: (id) => this.npcs[id],
      currentRegion: () => this.currentRegionId,
      isQuiet: () => !this.runner.isActive && !this.inputLocked && !this.avatar?.moving && this.time.now - this.lastInputAt > 4000 && this.discovered.has(this.currentRegionId),
    });

    // Where to stand: last region if remembered and discovered, else the meadow.
    const firstFlight = Boolean(this.worldData.firstFlight);
    // An arrival always lands at the front door; otherwise pick up where the
    // skylark was last seen.
    const startRegion = (!firstFlight && this.world.lastRegion && this.discovered.has(this.world.lastRegion) && regionById(this.world.lastRegion)) || REGIONS[0];
    const startZone = ZONES[startRegion.id];
    const spawn = { x: startRegion.x0 + startZone.spawn.x, y: startZone.spawn.y };
    const start = firstFlight ? { x: 160, y: 1000 } : spawn;

    this.avatar = createAvatar(this, start.x, start.y, { waterRects: this.allWater(), landRects: this.allLand() });
    this.cameraRig = setupCamera(this, this.avatar.sprite);
    this.cameras.main.centerOn(start.x, start.y - 120);
    this.cameraRig.follow();

    this.runner = new QuestRunner(this, {
      fixturesFor: (zoneId) => this.fixtures[zoneId],
      onCelebrate: (quest, step) => this.onCelebrate(quest, step),
      onEnd: (quest, npc) => this.onQuestEnd(quest, npc),
      focus: (x, y, z) => this.cameraRig.focus(x, y, z),
      release: () => this.cameraRig.release(),
    });

    this.wireInput();
    this.wireReactEvents();
    // e2e / debug: world → screen coordinates, and the current tap targets.
    this.game.toScreen = (x, y) => {
      const cam = this.cameras.main;
      return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom };
    };
    this.game.tapTargets = () => this.children.list.filter((o) => o.type === "Zone").map((z) => ({ x: z.x, y: z.y, w: z.width, h: z.height }));
    this.game.worldScene = this;
    this.refreshMarkers();
    this.refreshPet(true);
    this.emitState();
    this.game.events.emit("world-ready");
    music.start(startRegion.id);
    this.game.events.on("dialog", this.onDialogDuck = () => music.duck(true));
    this.game.events.on("dialog-close", this.onDialogUnduck = () => music.duck(false));

    // The wordless first minute: no instructions, a feather two hops away
    // and a robin that beckons until the kid follows.
    const needsTutorial = !this.world.tutorialDone && !Object.values(this.world.quests).some((q) => q.done);
    const beginTutorial = () => {
      if (!needsTutorial || this.tutorial) return;
      const robin = this.npcs.meadow?.byId("robin");
      const welcome = ZONES.meadow.feathers.find((f) => f.id === "welcomeFeather");
      const feather = welcome && !this.world.feathers.includes(welcome.id) ? toWorld(REGIONS[0], welcome) : null;
      this.tutorial = startTutorial(this, {
        robin,
        feather,
        onDone: () => {
          this.world = applyTutorialDone(this.world);
          this.save();
        },
      });
      if (!feather) this.tutorial.featherCollected();
    };
    if (firstFlight) {
      this.inputLocked = true;
      this.time.delayedCall(600, () => {
        this.avatar.flyTo(spawn.x, spawn.y, {
          cinematic: true,
          onArrive: () => {
            this.inputLocked = false;
            this.game.events.emit("first-flight-complete");
            this.toast("Welcome to Skylark Island!");
            beginTutorial();
          },
        });
      });
    } else {
      this.time.delayedCall(400, () => this.toast(startRegion.title, startRegion.groupTitle));
      if (startRegion.id === "meadow") this.time.delayedCall(1500, beginTutorial);
    }
    // The companion thinks every so often.
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.tickFollower() });

    this.events.once("shutdown", () => this.teardown());
  }

  buildZone(zone, region) {
    const f = {
      bridge: buildBridge(this, zone, region),
      feeder: buildFeeder(this, zone, region),
      nests: buildNests(this, zone, region),
      gate: buildGate(this, zone, region),
      chicks: buildChicks(this, zone, region, { found: fixtureOn(this.world, zone.objects.chicks.fixture) }),
    };
    for (const [name, h] of Object.entries(f)) {
      if (h && name !== "chicks" && fixtureOn(this.world, h.fixture)) h.complete(true);
    }
    this.fixtures[zone.id] = f;
    this.npcs[zone.id] = buildNpcs(this, zone, region, { onTap: (npc) => this.onNpcTap(zone, region, npc) });
    this.signposts[zone.id] = buildSignpost(this, region);
    this.featherHandles[zone.id] = buildFeathers(this, zone, region, this.world.feathers, (id) => this.collectFeather(id));
    if (zone.home) {
      this.home = buildHome(this, zone, region);
      this.home.renderDecorations(zone.home.shop, this.world.decorations);
    }
    if (zone.seedPlot) {
      this.seedPlot = buildSeedPlot(this, zone, region, seedStage(this.world, todayKey()), {
        onPlant: () => {
          this.world = applyPlantSeed(this.world, todayKey());
          this.save();
          this.toast("A seed is planted!", "Come back tomorrow to see it sprout.");
        },
        onHarvest: () => {
          this.world = applyHarvestFlower(this.world, todayKey());
          this.save();
          this.toast("A flower!", "Two stars for your patience.");
          this.refreshPet();
        },
        onWait: (stage) => this.toast(stage === 0 ? "Planted today." : "It's sprouting!", stage === 0 ? "Sprouts tomorrow." : "One more day until it blooms."),
      });
    }
    // Tapping the ten-frame board starts the gate quest.
    const gate = f.gate;
    hitZone(this, gate.board.x, gate.board.y, 240, 130, () => this.onGateTap(zone));
  }

  /** Today's visitor on the beach, unless already helped today. */
  buildVisitor() {
    const v = visitorForDate(new Date());
    if (this.world.visitorDay === v.day) return;
    if (!this.textures.exists(`bird-${v.bird}`)) return;
    const def = { id: "visitor", name: v.name, bird: v.bird, x: VISITOR_SPOT.x, y: VISITOR_SPOT.y, size: 104, questId: `visitor-${v.day}`, thanks: v.thanks, voice: v.voice };
    const region = { x0: 0, id: "visitor" };
    const group = buildNpcs(this, { npcs: [def] }, region, {
      onTap: (npc) => {
        if (this.runner.isActive || this.inputLocked) return;
        npc.greet(this.avatar.x);
        const spot = npc.talkSpot();
        this.avatar.goTo(spot.x + 240, spot.y, {
          onArrive: () => {
            npc.face(this.avatar.x);
            this.avatar.face(-1);
            this.runner.start({ id: "meadow", quests: [], objects: {} }, visitorQuest(v), npc);
          },
        });
      },
    });
    this.visitor = { group, npc: group.list[0], day: v.day };
    this.visitor.npc.setMarker(true);
  }

  allWater() {
    return REGIONS.flatMap((r) => (ZONES[r.id] ? worldRects(ZONES[r.id], r) : []));
  }
  allLand() {
    return REGIONS.flatMap((r) => (ZONES[r.id]?.land ?? []).map((l) => ({ ...l, x: l.x + r.x0 })));
  }

  computeDiscovered() {
    const set = new Set([REGIONS[0].id]);
    for (const id of this.world.discovered) set.add(id);
    REGIONS.forEach((r, i) => {
      if (groupPlayed(this.byMode, r.modeIds)) {
        set.add(r.id);
        if (REGIONS[i + 1]) set.add(REGIONS[i + 1].id);
      }
    });
    if (this.override === "all") REGIONS.forEach((r) => set.add(r.id));
    // Mist is contiguous: a region opens only once everything before it has.
    const out = new Set();
    for (const r of REGIONS) {
      if (set.has(r.id)) out.add(r.id);
      else break;
    }
    return out;
  }

  moveBounds() {
    let last = REGIONS[0];
    for (const r of REGIONS) if (this.discovered.has(r.id)) last = r;
    return { minX: SEA_LEFT_W - 40, maxX: last.x1 - 150 };
  }

  // ------------------------------------------------------------------ input

  consumePointer() {
    this.pointerConsumed = true;
  }

  wireInput() {
    // Game-object handlers run BEFORE this scene-level handler, so a tap
    // target has already marked the pointer consumed by the time we get
    // here. Phaser occasionally misses a target when a move and a press
    // arrive in the same frame, so re-check with a fresh hit test and hand
    // the press to the top-most target ourselves.
    this.input.on("pointerdown", (p) => {
      // A press that started on the DOM layer is not a tap on the island.
      if (p.event?.target && p.event.target !== this.game.canvas) {
        this.downAt = null;
        return;
      }
      this.downAt = { x: p.x, y: p.y };
      this.lastInputAt = this.time.now;
      this.life?.interrupt();
      if (this.pointerConsumed) return;
      const zones = this.input.hitTestPointer(p).filter((o) => o.type === "Zone" && o.input?.enabled);
      const top = zones[zones.length - 1];
      if (top) top.emit("pointerdown", p, 0, 0, { stopPropagation() {} });
    });
    this.input.on("pointerup", (p) => {
      const consumed = this.pointerConsumed;
      this.pointerConsumed = false;
      if (consumed || this.inputLocked || this.runner.isActive) return;
      if (!this.downAt || Phaser.Math.Distance.Between(this.downAt.x, this.downAt.y, p.x, p.y) > TAP_SLOP) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.moveTo(wp.x, wp.y);
    });
  }

  moveTo(x, y) {
    const { minX, maxX } = this.moveBounds();
    let tx = Phaser.Math.Clamp(x, minX, maxX);
    let ty = clampToGround(y);
    // Don't land in the pond: snap to the near bank. But water answers the
    // tap first — ripples, and maybe a frog.
    const water = this.allWater();
    const land = this.allLand();
    const inRect = (r) => tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h;
    const streams = Object.values(this.fixtures).map((f) => f.bridge?.streamRect).filter(Boolean);
    if (streams.some(inRect)) this.reactive.water(tx, ty);
    if (water.some(inRect) && !land.some(inRect)) {
      this.reactive.water(tx, ty);
      const w = water.find(inRect);
      ty = Math.min(WORLD_H - 40, w.y + w.h + 18);
    }
    this.avatar.goTo(tx, ty);
  }

  wireReactEvents() {
    const ev = this.game.events;
    this.handlers = {
      "shop-buy": (itemId) => this.buyDecoration(itemId),
      "go-region": (id) => this.goToRegion(id),
      "map-open": () => this.game.events.emit("avatar-x", this.avatar?.x ?? null),
      "dialog-next": () => {
        if (!this.runner.isActive) {
          ev.emit("dialog-close");
          this.cameraRig.release();
        }
      },
    };
    for (const [name, fn] of Object.entries(this.handlers)) ev.on(name, fn);
  }

  teardown() {
    for (const [name, fn] of Object.entries(this.handlers ?? {})) this.game.events.off(name, fn);
    this.runner?.destroy();
    this.tutorial?.destroy();
    this.secrets?.destroy();
    this.life?.destroy();
    destroySeasonal(this.seasonal);
    this.visitor?.group.destroy();
    this.migration?.group?.destroy();
    this.game.events.off("dialog", this.onDialogDuck);
    this.game.events.off("dialog-close", this.onDialogUnduck);
    music.stop();
    this.reactive?.destroy();
    destroyAmbient(this.ambient);
    this.cameraRig?.destroy();
    this.avatar?.destroy();
    this.follower?.destroy();
  }

  // ------------------------------------------------------------- quests

  onNpcTap(zone, region, npc) {
    if (this.runner.isActive || this.inputLocked) return;
    const quest = availableQuests(this.world, zone).find((q) => q.npcId === npc.def.id) ?? null;
    npc.greet(this.avatar.x);
    const spot = npc.talkSpot();
    this.avatar.goTo(spot.x, spot.y, {
      onArrive: () => {
        npc.face(this.avatar.x);
        this.avatar.face(1);
        if (quest) {
          this.tutorial?.questStarted();
          this.runner.start(zone, quest, npc);
        } else {
          this.sayHello(zone, npc);
        }
      },
    });
  }

  sayHello(zone, npc) {
    const helped = zone.quests.some((q) => q.npcId === npc.def.id && questDone(this.world, q.id));
    const line = helped ? npc.def.thanks : `Hello! I'm ${npc.def.name}. Come back soon!`;
    if (helped) npc.flourish();
    this.cameraRig.focus(npc.x, npc.y, 1.12);
    this.game.events.emit("dialog", { speaker: npc.def.name, portrait: npc.def.bird, line, hint: "done" });
  }

  onGateTap(zone) {
    if (this.runner.isActive || this.inputLocked) return;
    const gate = this.fixtures[zone.id].gate;
    const quest = availableQuests(this.world, zone).find((q) => q.id === zone.objects.gate.questId);
    if (!quest) {
      if (gate.isOpen() && zone.id === "cliffs" && this.world.migrationDone) this.flockFlyover(regionById(zone.regionId));
      else if (gate.isOpen()) this.toast("The gate is open.", "The way ahead is clear!");
      return;
    }
    const spot = gate.anchor;
    this.avatar.goTo(spot.x, spot.y, {
      onArrive: () => {
        this.avatar.face(1);
        this.runner.start(zone, quest, null);
      },
    });
  }

  onCelebrate(quest, step) {
    this.world = applyQuestComplete(this.world, quest.id, step.stars, step.fixture);
    this.save();
    this.refreshPet();
  }

  onQuestEnd(quest, npc) {
    if (!quest) return;
    if (quest.id.startsWith("migration-")) {
      this.time.delayedCall(600, () => this.sendMigrantOff());
      return;
    }
    if (quest.id.startsWith("visitor-")) {
      this.world = applyVisitorHelped(this.world, this.visitor?.day);
      this.save();
      this.refreshPet();
      this.emitState();
      const v = this.visitor;
      if (v) {
        v.npc.setMarker(false);
        this.time.delayedCall(1500, () => {
          const sprite = v.npc.sprite;
          sfx.takeoff();
          this.tweens.add({ targets: sprite, scaleY: sprite.scaleY * 0.7, duration: 100, yoyo: true, repeat: 16 });
          this.tweens.add({ targets: sprite, x: sprite.x - 900, y: sprite.y - 600, alpha: 0.2, duration: 2400, ease: "Sine.easeIn", onComplete: () => v.group.destroy() });
          this.toast("Safe travels!", "Someone new lands tomorrow.");
        });
        this.visitor = null;
      }
      return;
    }
    const zone = ZONES[regionAtX(npc?.x ?? this.avatar.x)?.id] ?? this.zoneOfQuest(quest.id);
    const region = regionById(zone.regionId);
    const last = quest.steps.at(-1);
    this.refreshMarkers();
    this.maybeGiftEgg();
    if (last.fixture === zone.objects.gate.fixture) {
      const next = REGIONS[region.index + 1];
      if (next) this.time.delayedCall(500, () => this.discover(next));
      else this.time.delayedCall(800, () => this.startMigration(region));
    }
  }

  // ------------------------------------------------------ the finale

  /** One bird after another lands on the lookout with one last thing to ask. */
  startMigration(region) {
    if (this.migration) return;
    const spot = migrationSpot();
    this.migration = { index: 0, region };
    this.toast("The Big Migration!", "Every bird needs one more thing before it flies.");
    this.avatar.goTo(spot.x - 150, spot.y + 10, { onArrive: () => this.nextMigrant() });
  }

  nextMigrant() {
    const m = this.migration;
    if (!m) return;
    if (m.index >= MIGRATION_STOPS.length) return this.finishMigration();
    const stop = MIGRATION_STOPS[m.index];
    const spot = migrationSpot();
    const def = { id: "migrant", name: stop.name, bird: stop.bird, x: spot.x, y: spot.y, size: 110, questId: `migration-${m.index}`, thanks: stop.thanks, voice: stop.voice };
    const group = buildNpcs(this, { npcs: [def] }, { x0: 0, id: "migration" }, { onTap: () => {} });
    const npc = group.list[0];
    npc.hide();
    npc.flyIn(0);
    m.group = group;
    m.npc = npc;
    this.time.delayedCall(1900, () => {
      this.avatar.face(1);
      npc.face(this.avatar.x);
      this.runner.start({ id: "cliffs", quests: [], objects: {} }, migrationQuest(stop, m.index), npc);
    });
  }

  /** A migrant helped: it takes off into the sky; the next one lands. */
  sendMigrantOff() {
    const m = this.migration;
    if (!m?.npc) return;
    const sprite = m.npc.sprite;
    const group = m.group;
    sfx.takeoff();
    this.tweens.add({ targets: sprite, scaleY: sprite.scaleY * 0.7, duration: 100, yoyo: true, repeat: 18 });
    this.tweens.add({ targets: sprite, x: sprite.x + 1100, y: sprite.y - 700, alpha: 0.3, duration: 2200, ease: "Sine.easeIn", onComplete: () => group.destroy() });
    m.npc = null;
    m.group = null;
    m.index += 1;
    this.time.delayedCall(1300, () => this.nextMigrant());
  }

  finishMigration() {
    const region = this.migration?.region ?? REGIONS[REGIONS.length - 1];
    this.migration = null;
    this.world = applyMigrationDone(this.world);
    this.save();
    this.flockFlyover(region);
    // The whole island cheers: every bird hops, sparkles everywhere.
    for (const group of Object.values(this.npcs)) for (const n of group.list) this.time.delayedCall(Math.random() * 1500, () => n.cheer());
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(300 + i * 350, () => sparkle(this, region.x0 + Math.random() * 2000, 700 + Math.random() * 400, { count: 14, tint: [0xfff3d6, 0xffd166, 0xfbc7a8][i % 3], radius: 70 }));
    }
    this.time.delayedCall(6500, () => this.toast("You did it!", "Every bird on Skylark Island is on its way. See you next season."));
    this.emitState();
  }

  zoneOfQuest(questId) {
    return Object.values(ZONES).find((z) => z.quests.some((q) => q.id === questId));
  }

  refreshMarkers() {
    for (const region of REGIONS) {
      const zone = ZONES[region.id];
      const npcs = this.npcs[region.id];
      if (!zone || !npcs) continue;
      const open = availableQuests(this.world, zone);
      for (const n of npcs.list) n.setMarker(this.discovered.has(region.id) && open.some((q) => q.npcId === n.def.id));
    }
    this.emitState();
  }

  // ---------------------------------------------------------- discovery

  discover(region) {
    if (this.discovered.has(region.id)) return;
    this.discovered.add(region.id);
    this.world = applyDiscover(this.world, region.id);
    this.save();
    this.inputLocked = true;
    const mist = this.mists[region.id];
    this.time.delayedCall(200, () => mist?.reveal());
    this.toast(region.title, "A new place to explore!");
    // The birds of the new region fly in as the mist clears — a moment to
    // watch, nothing to tap, then the camera comes home.
    this.time.delayedCall(1500, () => this.npcs[region.id]?.flyInAll());
    this.cameraRig.cinematic(region.x0 + 640, 880, 1500, 3600, () => {
      this.inputLocked = false;
      this.refreshMarkers();
    });
  }

  goToRegion(id) {
    const region = regionById(id);
    if (!region || !this.discovered.has(id) || this.runner.isActive || this.inputLocked) return;
    const zone = ZONES[id];
    const tx = region.x0 + zone.spawn.x;
    const ty = zone.spawn.y;
    if (Math.abs(tx - this.avatar.x) < 200) return;
    this.inputLocked = true;
    this.avatar.flyTo(tx, ty, { cinematic: true, onArrive: () => (this.inputLocked = false) });
  }

  onRegionEnter(region) {
    if (this.currentRegionId === region.id) return;
    const first = this.currentRegionId === null;
    this.currentRegionId = region.id;
    this.world = applyLastRegion(this.world, region.id);
    this.save();
    if (!first) this.toast(region.title, region.groupTitle);
    this.game.events.emit("region-change", region.id);
    music.setRegion(region.id);
    this.emitState();
  }

  /** The cliffs finale: the whole flock sweeps past the lookout. */
  flockFlyover(region) {
    const species = ["robin", "cardinal", "blueJay", "goldfinch", "kingfisher", "puffin", "mourningDove", "chickadee", "houseWren", "downyWoodpecker", "kestrel", "snowyOwl", "sandhillCrane", "whoopingCrane-fly", "condor-fly", "barnOwl-fly", "hummingbird", "paintedBunting", "junco", "houseFinch"];
    this.toast("The whole flock!", "Everyone came to see the lookout.");
    sfx.reveal();
    species.forEach((id, i) => {
      const key = `bird-${id}`;
      if (!this.textures.exists(key)) return;
      const { h } = birdSize(id.split("-")[0]);
      const y0 = 260 + (i % 5) * 70 + Math.random() * 30;
      const s = this.add.image(region.x0 - 300, y0, key).setScale((70 + Math.random() * 30) / h).setDepth(DEPTH.sky).setAlpha(0.95);
      const p = { t: 0 };
      this.tweens.add({
        targets: p,
        t: 1,
        duration: 6000,
        delay: i * 180,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          s.x = region.x0 - 300 + (region.x1 + 700 - region.x0 + 300) * p.t;
          s.y = y0 + Math.sin(p.t * Math.PI * 2 + i) * 40;
        },
        onComplete: () => s.destroy(),
      });
      this.tweens.add({ targets: s, scaleY: s.scaleY * 0.7, duration: 130, yoyo: true, repeat: 40, delay: i * 180 });
    });
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(500 + i * 400, () => sparkle(this, region.x0 + 200 + Math.random() * 1700, 300 + Math.random() * 400, { count: 12, tint: 0xfff3d6, radius: 60 }));
    }
  }

  // ------------------------------------------------------------ the pet

  maybeGiftEgg() {
    if (this.world.egg || !this.home) return;
    if (!Object.values(this.world.quests).some((q) => q.done)) return;
    this.world = applyReceiveEgg(this.world, this.practiceStars);
    this.save();
    const p = this.home.petPosition();
    sparkle(this, p.x, p.y - 30, { count: 20, tint: 0xfff3d6, radius: 60 });
    sfx.chime();
    this.home.renderPet(0);
    this.petStageShown = 0;
    this.toast("A gift for your nest!", "An egg. Practice keeps it warm.");
    this.emitState();
  }

  refreshPet(initial = false) {
    if (!this.home) return;
    const stage = petStage(this.world, this.practiceStars);
    if (stage === "hatched" && this.petStageShown !== "hatched" && !initial) {
      this.home.hatch(() => this.spawnFollower());
    } else {
      this.home.renderPet(stage);
      if (stage === "hatched") this.spawnFollower();
    }
    this.petStageShown = stage;
    this.emitState();
  }

  spawnFollower() {
    if (this.follower || !this.home) return;
    const p = this.home.petPosition();
    // Three sizes: the chick grows with practice.
    const size = this.practiceStars >= 120 ? 62 : this.practiceStars >= 40 ? 54 : 46;
    this.follower = createFollower(this, p.x, p.y + 8, "bird-condorChick", size);
    this.avatar.setFollower(this.follower);
    this.follower.follow(this.avatar.x, this.avatar.y, this.avatar.facing);
  }

  tickFollower() {
    if (!this.follower || !this.avatar) return;
    const feathers = Object.values(this.featherHandles)
      .flat()
      .filter((f) => f.img?.active)
      .map((f) => ({ x: f.img.x, y: f.img.y }));
    const questNpcs = Object.values(this.npcs)
      .flatMap((n) => n.list)
      .filter((n) => n.marker)
      .map((n) => ({ x: n.x, y: n.y }));
    const owls = Object.values(this.npcs)
      .flatMap((n) => n.list)
      .filter((n) => n.def.bird === "snowyOwl" || n.def.bird === "barnOwl")
      .map((n) => ({ x: n.x, y: n.y }));
    this.follower.tick({
      avatar: { x: this.avatar.x, y: this.avatar.y, facing: this.avatar.facing },
      idleMs: this.time.now - this.lastInputAt,
      questActive: this.runner.isActive || this.inputLocked || this.avatar.moving,
      feathers,
      questNpcs,
      owls,
      night: this.ambient?.mode === "night",
      nest: this.home?.petPosition() ?? null,
    });
  }

  // ------------------------------------------------------------- economy

  onSecretFound(id) {
    this.world = applySecretFound(this.world, id, 2);
    this.save();
    this.toast("You found a secret!", `${this.world.secrets.length} of ${SECRET_COUNT} on the island.`);
    this.refreshPet();
  }

  collectFeather(id) {
    this.world = applyCollectFeather(this.world, id);
    this.save();
    if (id === "welcomeFeather") this.tutorial?.featherCollected();
    this.toast("A feather!", "Tucked into your pocket.");
    this.emitState();
  }

  buyDecoration(itemId) {
    const zone = ZONES.meadow;
    const item = zone.home?.shop.find((i) => i.id === itemId);
    if (!item || !this.home) return;
    const before = this.world;
    this.world = applyBuyDecoration(this.world, itemId, item.cost);
    if (this.world === before) return;
    this.save();
    this.home.renderDecorations(zone.home.shop, this.world.decorations, itemId);
    this.emitState();
  }

  save() {
    persistWorldState(this.world);
  }

  emitState() {
    this.game.events.emit("world-state", {
      stars: this.world.stars,
      feathers: this.world.feathers,
      decorations: this.world.decorations,
      pet: petStage(this.world, this.practiceStars),
      seed: seedStage(this.world, todayKey()),
      discovered: [...this.discovered],
      region: this.currentRegionId,
      quests: this.world.quests,
      secrets: this.world.secrets,
      secretCount: SECRET_COUNT,
      migrationDone: this.world.migrationDone,
    });
  }

  toast(title, sub) {
    this.game.events.emit("toast", { title, sub });
  }

  // ------------------------------------------------------------- update

  update(time) {
    updateTerrain(this.terrain, time);
    updateAmbient(this.ambient, time);
    if (!this.avatar) return;
    const r = regionAtX(this.avatar.x);
    if (r) this.onRegionEnter(r);
    if ((time | 0) % 6 === 0) {
      for (const n of Object.values(this.npcs)) n.watch(this.avatar.x);
    }
    this.cameraRig.setLookAhead(this.avatar.moving ? this.avatar.facing : 0);
    if ((time | 0) % 30 === 0) this.game.events.emit("avatar-x", this.avatar.x);
  }
}
