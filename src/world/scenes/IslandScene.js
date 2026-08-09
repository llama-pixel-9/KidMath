import Phaser from "phaser";
import { ZONES } from "../zones/index";
import {
  loadWorldState,
  persistWorldState,
  applyQuestComplete,
  questDone,
  fixtureOn,
  availableQuests,
  applyReceiveEgg,
  applyCollectFeather,
  applyBuyDecoration,
  applyPlantSeed,
  applyHarvestFlower,
  seedStage,
  petStage,
  todayKey,
} from "../worldStore";

const PLAYER_SPEED = 0.42; // world px per ms — a brisk hop, not a sprint
const TAP_SLOP_PX = 14;
const TALK_DISTANCE = 130;

/**
 * The first walkable island (plan Phase 2). Tap-to-move (no virtual
 * joystick, per the cut list), NPCs with intrinsically-integrated counting
 * quests, permanent world changes, and a data-driven quest runner that
 * interprets the zone def's step DSL — so new quests are content, not code.
 *
 * Dialog is DOM-side (QuestDialog, audio-first); the scene and React talk
 * over game.events:
 *   scene → 'island-dialog' {speaker, line, options?, hint}
 *   scene → 'island-dialog-close', 'world-stars' {stars}, 'pick-wrong'
 *   react → 'dialog-next', 'dialog-pick' {value}, 'world-go-map'
 */
export default class IslandScene extends Phaser.Scene {
  constructor() {
    super("island");
  }

  init(data) {
    this.zone = ZONES[data?.zoneId] ?? ZONES.meadow;
    this.mapData = data?.mapData ?? {};
    this.worldState = loadWorldState();
    this.activeQuest = null;
    this.stepIndex = 0;
    this.dialogOpen = false;
    this.stepTargets = [];
  }

  preload() {
    for (const npc of this.zone.npcs) this.load.image(`npc-${npc.id}`, npc.art);
    const o = this.zone.objects;
    if (o.feeder) this.load.image("obj-feeder", o.feeder.art);
    if (o.nests) {
      this.load.image("obj-nest", o.nests.art);
      this.load.image("obj-egg", o.nests.eggArt);
    }
    if (o.gate) this.load.image("obj-gate", o.gate.art);
    if (o.chicks) this.load.image("obj-chick", o.chicks.art);
    // Ownership layer art: the home nest, pet egg stages, shop items,
    // hidden feathers.
    const home = this.zone.home;
    if (home) {
      this.load.image("home-nest", home.nestArt);
      home.eggArts.forEach((art, i) => this.load.image(`pet-egg-${i}`, art));
      this.load.image("pet-chick", home.chickArt);
      for (const item of home.shop) this.load.image(`deco-${item.id}`, item.art);
    }
    for (const feather of this.zone.feathers ?? []) {
      this.load.image(`feather-${feather.id}`, feather.art);
    }
  }

  create() {
    const { width, height } = this.zone.bounds;
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor("#8ed1e8");

    if (this.textures.exists(`zone-${this.zone.backdrop}`)) {
      this.add.image(0, 0, `zone-${this.zone.backdrop}`).setOrigin(0, 0);
    }

    this.buildBridge();
    this.buildFeeder();
    this.buildNests();
    this.buildGate();
    this.chickSprites = [];
    this.buildNpcs();
    this.restoreFoundChicks();
    this.buildHome();
    this.buildFeathers();
    this.buildSeedPlot();
    this.buildPlayer();

    this.cameras.main.startFollow(this.player, false, 0.12, 0.12);

    // Ground taps move the player — but only taps (not drags) and only when
    // nothing interactive was under the pointer and no dialog is up.
    this.input.on("pointerup", (pointer, over) => {
      if (this.dialogOpen || (over && over.length)) return;
      const travel = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY);
      if (travel > TAP_SLOP_PX) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.walkTo(world.x, world.y);
    });

    const onNext = () => this.advanceStep();
    const onPick = (value) => this.handlePick(value);
    const onGoMap = () => {
      this.game.events.emit("island-dialog-close");
      this.game.events.emit("home-close");
      this.scene.start("worldMap", this.mapData);
    };
    const onBuy = (itemId) => this.buyDecoration(itemId);
    this.game.events.on("dialog-next", onNext);
    this.game.events.on("dialog-pick", onPick);
    this.game.events.on("world-go-map", onGoMap);
    this.game.events.on("shop-buy", onBuy);
    this.events.once("shutdown", () => {
      this.game.events.off("dialog-next", onNext);
      this.game.events.off("dialog-pick", onPick);
      this.game.events.off("world-go-map", onGoMap);
      this.game.events.off("shop-buy", onBuy);
    });

    this.emitWorldState();
    // The egg gift waits for a settled scene: any finished quest earns it.
    this.time.delayedCall(600, () => this.maybeGiftEgg());
  }

  /** Stars from arcade practice also warm the egg (registry-provided). */
  practiceStars() {
    return this.game.registry.get("worldData")?.practiceStars ?? 0;
  }

  emitWorldState() {
    this.game.events.emit("world-state", {
      stars: this.worldState.stars,
      feathers: this.worldState.feathers,
      decorations: this.worldState.decorations,
      pet: petStage(this.worldState, this.practiceStars()),
      seed: seedStage(this.worldState, todayKey()),
    });
  }

  saveAndEmit() {
    persistWorldState(this.worldState);
    this.emitWorldState();
  }

  // -------------------------------------------------------------- player

  buildPlayer() {
    const { x, y } = this.zone.spawn;
    this.player = this.textures.exists("skylark-fly")
      ? this.add.image(x, y, "skylark-fly").setScale(110 / 443)
      : this.add.ellipse(x, y, 80, 64, 0x8a6f5c);
    this.player.setDepth(50);
  }

  walkTo(x, y, onArrive) {
    const { width, height } = this.zone.bounds;
    const tx = Phaser.Math.Clamp(x, 60, width - 60);
    const ty = Phaser.Math.Clamp(y, 200, height - 40);
    this.moveTween?.stop();
    this.hopTween?.stop();
    this.player.setFlipX(tx < this.player.x);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);
    if (distance < 8) {
      onArrive?.();
      return;
    }
    this.hopTween = this.tweens.add({
      targets: this.player,
      angle: { from: -4, to: 4 },
      duration: 160,
      yoyo: true,
      repeat: -1,
    });
    this.moveTween = this.tweens.add({
      targets: this.player,
      x: tx,
      y: ty,
      duration: distance / PLAYER_SPEED,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.hopTween?.stop();
        this.player.setAngle(0);
        onArrive?.();
      },
    });
  }

  // ---------------------------------------------------------------- npcs

  buildNpcs() {
    this.npcSprites = new Map();
    this.questMarkers = new Map();
    for (const npc of this.zone.npcs) {
      const sprite = this.textures.exists(`npc-${npc.id}`)
        ? this.add.image(npc.x, npc.y, `npc-${npc.id}`).setScale(npc.size / npc.h)
        : this.add.ellipse(npc.x, npc.y, npc.size, npc.size, 0xd97742);
      sprite.setDepth(20).setInteractive({ useHandCursor: true });
      sprite.on("pointerup", () => this.approachNpc(npc));
      this.tweens.add({
        targets: sprite,
        y: npc.y - 6,
        duration: Phaser.Math.Between(1800, 2600),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.npcSprites.set(npc.id, sprite);
    }
    // The gate is quest-giver for its own quest (id from the zone def —
    // quest ids are globally unique across zones).
    const gateDef = this.zone.objects.gate;
    if (this.gateSprite && gateDef && !fixtureOn(this.worldState, gateDef.fixture)) {
      this.gateSprite.setInteractive({ useHandCursor: true });
      this.gateSprite.on("pointerup", () => {
        const quest = this.zone.quests.find((q) => q.id === gateDef.questId);
        if (quest && !questDone(this.worldState, quest.id)) {
          this.walkTo(gateDef.x + 150, gateDef.y + 120, () => this.startQuest(quest));
        }
      });
    }
    this.refreshQuestMarkers();
  }

  refreshQuestMarkers() {
    for (const marker of this.questMarkers.values()) marker.destroy();
    this.questMarkers.clear();
    const open = new Set(availableQuests(this.worldState, this.zone).map((q) => q.npcId));
    for (const npc of this.zone.npcs) {
      if (!open.has(npc.id)) continue;
      const marker = this.add
        .text(npc.x, npc.y - npc.size * 0.85, "!", {
          fontFamily: "Fredoka, system-ui, sans-serif",
          fontSize: "44px",
          color: "#f4b731",
          stroke: "#7a4a12",
          strokeThickness: 5,
        })
        .setOrigin(0.5, 1)
        .setDepth(21);
      this.tweens.add({
        targets: marker,
        y: marker.y - 12,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.questMarkers.set(npc.id, marker);
    }
  }

  approachNpc(npc) {
    if (this.dialogOpen) return;
    const quest = this.zone.quests.find(
      (q) => q.npcId === npc.id && availableQuests(this.worldState, this.zone).includes(q),
    );
    this.walkTo(npc.x - TALK_DISTANCE, npc.y + 30, () => {
      if (quest) {
        this.startQuest(quest);
      } else {
        // NPCs remember you (relatedness, plan principle 2) — their
        // after-quest line lives in the zone def.
        this.game.events.emit("island-dialog", {
          speaker: npc.name,
          line: npc.thanks ?? "Hello again, friend!",
          hint: "done",
        });
        this.dialogOpen = true;
      }
    });
  }

  // -------------------------------------------------------- quest runner

  startQuest(quest) {
    this.activeQuest = quest;
    this.stepIndex = -1;
    this.dialogOpen = true;
    this.advanceStep();
  }

  currentNpcName() {
    const npc = this.zone.npcs.find((n) => n.id === this.activeQuest?.npcId);
    return npc?.name ?? "Skylark";
  }

  advanceStep() {
    if (!this.activeQuest) {
      this.dialogOpen = false;
      this.game.events.emit("island-dialog-close");
      // A finished first quest may have just earned the egg gift.
      this.time.delayedCall(400, () => this.maybeGiftEgg());
      return;
    }
    this.stepIndex += 1;
    const step = this.activeQuest.steps[this.stepIndex];
    if (!step) {
      this.endQuest();
      return;
    }
    this.dialogOpen = true;
    switch (step.type) {
      case "talk":
        this.game.events.emit("island-dialog", {
          speaker: this.currentNpcName(),
          line: step.line,
          hint: "next",
        });
        break;
      case "pickNumber":
        this.game.events.emit("island-dialog", {
          speaker: this.currentNpcName(),
          line: step.line,
          options: step.options,
        });
        break;
      case "countTap":
        this.game.events.emit("island-dialog", {
          speaker: this.currentNpcName(),
          line: step.line,
          hint: "play",
        });
        // Play steps happen in the world — walking stays enabled so the kid
        // can roam to far-away targets (the chick hunt spans the island).
        this.dialogOpen = false;
        this.beginCountTap(step);
        break;
      case "placeItems":
        this.game.events.emit("island-dialog", {
          speaker: this.currentNpcName(),
          line: step.line,
          hint: "play",
        });
        this.dialogOpen = false;
        this.beginPlaceItems(step);
        break;
      case "celebrate":
        this.completeQuest(step);
        break;
      default:
        this.advanceStep();
    }
  }

  handlePick(value) {
    const step = this.activeQuest?.steps[this.stepIndex];
    if (!step || step.type !== "pickNumber") return;
    if (value === step.answer) {
      this.advanceStep();
    } else {
      // Wrong costs a wobble and another try — never progress.
      this.game.events.emit("pick-wrong");
    }
  }

  completeQuest(step) {
    const quest = this.activeQuest;
    this.worldState = applyQuestComplete(this.worldState, quest.id, step.stars, step.fixture);
    this.saveAndEmit();
    this.renderPet();
    this.applyFixtureVisual(step.fixture);
    this.starBurst(this.player.x, this.player.y - 60, step.stars);
    this.game.events.emit("island-dialog", {
      speaker: this.currentNpcName(),
      line: step.line,
      hint: "done",
      stars: step.stars,
    });
    this.activeQuest = null;
    this.refreshQuestMarkers();
  }

  endQuest() {
    this.activeQuest = null;
    this.dialogOpen = false;
    this.game.events.emit("island-dialog-close");
  }

  // ------------------------------------------- step mechanics: count taps

  beginCountTap(step) {
    this.clearStepTargets();
    const targets =
      step.targets === "bridge-slots" ? this.emptyPlankMarkers() : this.spawnChicks();
    let counted = 0;
    for (const target of targets) {
      target.setInteractive({ useHandCursor: true });
      target.once("pointerup", () => {
        counted += 1;
        this.countPop(target.x, target.y - 40, counted);
        this.tweens.add({ targets: target, scale: target.scale * 1.25, duration: 140, yoyo: true });
        if (counted === targets.length) {
          this.time.delayedCall(650, () => this.advanceStep());
        }
      });
      this.stepTargets.push(target);
    }
  }

  beginPlaceItems(step) {
    this.clearStepTargets();
    const object = this.zone.objects[step.target];
    const hitArea = this.stepHitAreaFor(object);
    let placed = 0;
    const onTap = () => {
      placed += 1;
      this.placeOneItem(step.target, placed);
      this.countPop(hitArea.x, hitArea.y - 70, placed);
      if (placed === step.count) {
        hitArea.off("pointerup", onTap);
        this.time.delayedCall(650, () => this.advanceStep());
      }
    };
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on("pointerup", onTap);
    this.stepTargets.push(hitArea);
  }

  stepHitAreaFor(object) {
    const zone = this.add
      .circle(object.x, object.y, 150, 0xffe9a8, 0.001)
      .setDepth(40);
    // A soft pulsing halo shows where to tap — wordless affordance.
    const halo = this.add.circle(object.x, object.y, 120, 0xffe9a8, 0.25).setDepth(5);
    this.tweens.add({
      targets: halo,
      scale: 1.25,
      alpha: 0.05,
      duration: 900,
      repeat: -1,
    });
    this.stepTargets.push(halo);
    return zone;
  }

  placeOneItem(targetName, index) {
    if (targetName === "bridge") this.layPlank(index);
    if (targetName === "feeder") this.dropSeed(index);
    if (targetName === "nests") this.tuckEgg(index);
    if (targetName === "gate") this.lightDot(index);
  }

  clearStepTargets() {
    for (const t of this.stepTargets) t.destroy();
    this.stepTargets = [];
  }

  countPop(x, y, n) {
    const pop = this.add
      .text(x, y, String(n), {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "56px",
        color: "#ffffff",
        stroke: "#1c7a5e",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: pop,
      y: y - 60,
      alpha: 0,
      scale: 1.4,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => pop.destroy(),
    });
  }

  starBurst(x, y, count) {
    for (let i = 0; i < count * 3; i++) {
      const star = this.add
        .text(x, y, "⭐", { fontSize: "30px" })
        .setOrigin(0.5)
        .setDepth(60);
      this.tweens.add({
        targets: star,
        x: x + Phaser.Math.Between(-140, 140),
        y: y - Phaser.Math.Between(60, 200),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(700, 1200),
        ease: "Sine.easeOut",
        onComplete: () => star.destroy(),
      });
    }
  }

  // ------------------------------------------- ownership layer (Phase 3)

  /** The egg gift after the first finished quest — given at the home zone
   *  by its first NPC. Once, wordlessly earned. */
  maybeGiftEgg() {
    if (!this.zone.home || this.worldState.egg || this.dialogOpen) return;
    if (Object.keys(this.worldState.quests).length === 0) return;
    this.worldState = applyReceiveEgg(this.worldState, this.practiceStars());
    this.saveAndEmit();
    this.renderPet();
    this.dialogOpen = true;
    this.game.events.emit("island-dialog", {
      speaker: this.zone.npcs[0]?.name ?? "Skylark",
      line: "You helped so much — this egg is for you! Practicing keeps it warm.",
      hint: "done",
    });
  }

  buildHome() {
    const home = this.zone.home;
    if (!home) return;
    if (this.textures.exists("home-nest")) {
      this.homeNest = this.add
        .image(home.x, home.y, "home-nest")
        .setScale(home.nestSize / home.nestW)
        .setDepth(8);
    } else {
      this.homeNest = this.add.ellipse(home.x, home.y, 190, 110, 0x8a5a3b).setDepth(8);
    }
    this.homeNest.setInteractive({ useHandCursor: true });
    this.homeNest.on("pointerup", () => {
      if (this.dialogOpen) return;
      this.walkTo(home.x + 140, home.y + 30, () => {
        this.emitWorldState();
        this.game.events.emit("home-open");
      });
    });
    for (const item of this.zone.home.shop) {
      if (this.worldState.decorations.includes(item.id)) this.renderDecoration(item);
    }
    this.renderPet();
  }

  renderPet() {
    const home = this.zone.home;
    if (!home) return;
    const stage = petStage(this.worldState, this.practiceStars());
    if (stage === null) {
      this.petSprite?.destroy();
      this.petSprite = null;
      return;
    }
    if (this.petStageShown === stage && this.petSprite) return;
    this.petStageShown = stage;
    this.petSprite?.destroy();
    if (stage === "hatched") {
      this.petSprite = this.textures.exists("pet-chick")
        ? this.add.image(home.x, home.y - 40, "pet-chick").setScale(0.16)
        : this.add.ellipse(home.x, home.y - 40, 60, 60, 0xf9d977);
      this.petSprite.setDepth(9);
      this.petFollows = true;
    } else {
      this.petSprite = this.textures.exists(`pet-egg-${stage}`)
        ? this.add.image(home.x, home.y - 34, `pet-egg-${stage}`).setScale(0.28)
        : this.add.ellipse(home.x, home.y - 34, 50, 64, 0xf5f8fa);
      this.petSprite.setDepth(9);
      this.petFollows = false;
      this.tweens.add({
        targets: this.petSprite,
        angle: { from: -3, to: 3 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  /** The hatched chick toddles after the skylark — ownership that moves. */
  update() {
    if (!this.petFollows || !this.petSprite || !this.player) return;
    const targetX = this.player.x - 70 * (this.player.flipX ? -1 : 1);
    const targetY = this.player.y + 30;
    this.petSprite.x += (targetX - this.petSprite.x) * 0.06;
    this.petSprite.y += (targetY - this.petSprite.y) * 0.06;
    this.petSprite.setFlipX(this.petSprite.x > targetX);
  }

  buyDecoration(itemId) {
    const item = this.zone.home?.shop.find((i) => i.id === itemId);
    if (!item) return;
    const before = this.worldState;
    this.worldState = applyBuyDecoration(this.worldState, item.id, item.cost);
    if (this.worldState === before) return; // owned already or short on stars
    this.saveAndEmit();
    this.renderDecoration(item, true);
  }

  renderDecoration(item, justBought = false) {
    const sprite = this.textures.exists(`deco-${item.id}`)
      ? this.add.image(item.x, item.y, `deco-${item.id}`).setScale(item.size / item.h)
      : this.add.ellipse(item.x, item.y, 80, 80, 0x8fce7c);
    sprite.setDepth(7);
    if (justBought) {
      sprite.setScale(sprite.scale * 0.1);
      this.tweens.add({ targets: sprite, scale: item.size / item.h, duration: 420, ease: "Back.easeOut" });
      this.starBurst(item.x, item.y - 40, 2);
    }
  }

  buildFeathers() {
    for (const feather of this.zone.feathers ?? []) {
      if (this.worldState.feathers.includes(feather.id)) continue;
      const sprite = this.textures.exists(`feather-${feather.id}`)
        ? this.add.image(feather.x, feather.y, `feather-${feather.id}`).setScale(0.16)
        : this.add.ellipse(feather.x, feather.y, 40, 40, 0xf4b731);
      sprite.setDepth(15).setInteractive({ useHandCursor: true });
      const glow = this.add.circle(feather.x, feather.y, 34, 0xfff3b0, 0.35).setDepth(14);
      this.tweens.add({ targets: glow, scale: 1.4, alpha: 0.1, duration: 1100, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: sprite, y: feather.y - 8, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      sprite.once("pointerup", () => {
        this.worldState = applyCollectFeather(this.worldState, feather.id);
        this.saveAndEmit();
        this.starBurst(feather.x, feather.y, 2);
        glow.destroy();
        this.tweens.add({ targets: sprite, y: sprite.y - 80, alpha: 0, duration: 600, onComplete: () => sprite.destroy() });
      });
    }
  }

  buildSeedPlot() {
    const plot = this.zone.seedPlot;
    if (!plot) return;
    this.seedSprites?.forEach((s) => s.destroy());
    this.seedSprites = [];
    const add = (s) => {
      this.seedSprites.push(s);
      return s;
    };
    const stage = seedStage(this.worldState, todayKey());
    const soil = add(this.add.ellipse(plot.x, plot.y, 110, 46, 0x9a6b45, stage === null ? 0.55 : 1).setDepth(6));
    soil.setInteractive({ useHandCursor: true });

    if (stage === 1) {
      const stem = add(this.add.rectangle(plot.x, plot.y - 26, 6, 40, 0x5da865).setDepth(7));
      add(this.add.ellipse(plot.x - 10, plot.y - 44, 22, 12, 0x6db470).setDepth(7).setAngle(-30));
      add(this.add.ellipse(plot.x + 10, plot.y - 44, 22, 12, 0x6db470).setDepth(7).setAngle(30));
      this.tweens.add({ targets: stem, angle: 3, duration: 1500, yoyo: true, repeat: -1 });
    }
    if (stage === 2) {
      const bloom = add(this.add.text(plot.x, plot.y - 40, "🌼", { fontSize: "56px" }).setOrigin(0.5).setDepth(7));
      this.tweens.add({ targets: bloom, scale: 1.12, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    soil.on("pointerup", () => {
      if (this.dialogOpen) return;
      this.walkTo(plot.x - 110, plot.y + 20, () => this.seedInteract());
    });
  }

  seedInteract() {
    const day = todayKey();
    const stage = seedStage(this.worldState, day);
    const say = (line) => {
      this.dialogOpen = true;
      this.game.events.emit("island-dialog", { speaker: "Skylark", line, hint: "done" });
    };
    if (stage === null) {
      this.worldState = applyPlantSeed(this.worldState, day);
      this.saveAndEmit();
      this.buildSeedPlot();
      say("A seed is planted! Come back tomorrow and see what happens.");
    } else if (stage === 0) {
      say("The seed is sleeping under the soil. See you tomorrow!");
    } else if (stage === 1) {
      say("It sprouted overnight! One more day until it blooms.");
    } else {
      this.worldState = applyHarvestFlower(this.worldState, day);
      this.saveAndEmit();
      this.renderPet();
      this.buildSeedPlot();
      this.starBurst(this.zone.seedPlot.x, this.zone.seedPlot.y - 40, 2);
      say("It bloomed! Two stars — and room to plant another seed.");
    }
  }

  // ------------------------------------------------- world object visuals

  buildBridge() {
    const b = this.zone.objects.bridge;
    if (!b) return;
    const fixed = fixtureOn(this.worldState, b.fixture);
    // The water the crossing spans; colors are zone-themable so the same
    // mechanic reads as planks in the meadow and stepping stones at the pond.
    const water = b.waterColor ?? 0x7fc4dd;
    const fill = b.plankColor ?? 0xa8703d;
    const edge = b.plankEdge ?? 0x7a4a1f;
    const round = b.style === "stones";
    this.add.ellipse(b.x, b.y + 8, 420, 110, water, 0.85).setDepth(2);
    this.plankSlots = [];
    const slotW = round ? 62 : 52;
    const startX = b.x - ((b.slots - 1) * slotW) / 2;
    const drawPiece = (x) =>
      round
        ? this.add.ellipse(x, b.y, 52, 40, fill).setStrokeStyle(3, edge).setDepth(3)
        : this.add.rectangle(x, b.y, 44, 96, fill).setStrokeStyle(3, edge).setDepth(3);
    for (let i = 0; i < b.slots; i++) {
      const x = startX + i * slotW;
      if (fixed || i < b.present) {
        drawPiece(x);
      } else {
        const slot = round
          ? this.add.ellipse(x, b.y, 52, 40, 0x1c4a5e, 0.15).setStrokeStyle(3, 0xffffff, 0.7).setDepth(3)
          : this.add.rectangle(x, b.y, 44, 96, 0x1c4a5e, 0.15).setStrokeStyle(3, 0xffffff, 0.7).setDepth(3);
        this.plankSlots.push(slot);
      }
    }
  }

  emptyPlankMarkers() {
    return this.plankSlots ?? [];
  }

  layPlank(index) {
    const slot = this.plankSlots?.[index - 1];
    const b = this.zone.objects.bridge;
    if (!slot || !b) return;
    const fill = b.plankColor ?? 0xa8703d;
    const edge = b.plankEdge ?? 0x7a4a1f;
    const plank =
      b.style === "stones"
        ? this.add.ellipse(slot.x, slot.y - 300, 52, 40, fill).setStrokeStyle(3, edge).setDepth(3)
        : this.add.rectangle(slot.x, slot.y - 300, 44, 96, fill).setStrokeStyle(3, edge).setDepth(3);
    this.tweens.add({ targets: plank, y: slot.y, duration: 380, ease: "Bounce.easeOut" });
  }

  buildFeeder() {
    const f = this.zone.objects.feeder;
    if (!f) return;
    if (this.textures.exists("obj-feeder")) {
      this.add.image(f.x, f.y, "obj-feeder").setScale(f.size / f.h).setOrigin(0.5, 1).setDepth(4);
    }
    this.seedDots = [];
    const full = fixtureOn(this.worldState, f.fixture) ? f.capacity : f.present;
    for (let i = 0; i < full; i++) this.dropSeed(i + 1, true);
  }

  dropSeed(index, instant = false) {
    const f = this.zone.objects.feeder;
    const x = f.x - 30 + ((index - 1) % 3) * 30;
    const y = f.y - (f.fillYOffset ?? 118) - Math.floor((index - 1) / 3) * 26;
    const seed = this.add.ellipse(x, instant ? y : y - 200, 20, 14, f.itemColor ?? 0x8a5a3b).setDepth(5);
    if (!instant) this.tweens.add({ targets: seed, y, duration: 320, ease: "Bounce.easeOut" });
  }

  buildNests() {
    const n = this.zone.objects.nests;
    if (!n) return;
    this.eggCount = 0;
    for (const spot of n.spots) {
      if (this.textures.exists("obj-nest")) {
        this.add.image(spot.x, spot.y, "obj-nest").setScale(n.size / n.w).setDepth(4);
      }
    }
    if (fixtureOn(this.worldState, n.fixture)) {
      for (let i = 1; i <= n.spots.length * n.eggsPer; i++) this.tuckEgg(i, true);
    }
  }

  tuckEgg(index, instant = false) {
    const n = this.zone.objects.nests;
    const spot = n.spots[Math.floor((index - 1) / n.eggsPer) % n.spots.length];
    const dx = ((index - 1) % n.eggsPer) * 26 - 13;
    if (this.textures.exists("obj-egg")) {
      const egg = this.add
        .image(spot.x + dx, (instant ? spot.y : spot.y - 180) - 18, "obj-egg")
        .setScale(0.13)
        .setDepth(5);
      if (!instant) this.tweens.add({ targets: egg, y: spot.y - 18, duration: 300, ease: "Bounce.easeOut" });
    }
  }

  buildGate() {
    const g = this.zone.objects.gate;
    if (!g) return;
    const open = fixtureOn(this.worldState, g.fixture);
    if (this.textures.exists("obj-gate")) {
      this.gateSprite = this.add.image(g.x, g.y, "obj-gate").setScale(g.size / g.w).setDepth(4);
      if (open) this.gateSprite.setAngle(-14).setAlpha(0.85);
    }
    // The ten frame floats above the gate: 2 rows of 5.
    this.gateDots = [];
    const lit = open ? 10 : g.tenFrameFilled;
    for (let i = 0; i < 10; i++) {
      const dx = (i % 5) * 34 - 68;
      const dy = Math.floor(i / 5) * 34 - 120;
      const dot = this.add
        .circle(g.x + dx, g.y + dy, 13, i < lit ? 0xf4b731 : 0xffffff, i < lit ? 1 : 0.45)
        .setStrokeStyle(2, 0x7a4a12)
        .setDepth(6);
      this.gateDots.push(dot);
    }
  }

  lightDot(index) {
    const g = this.zone.objects.gate;
    const dot = this.gateDots[g.tenFrameFilled + index - 1];
    if (!dot) return;
    dot.setFillStyle(0xf4b731, 1);
    this.tweens.add({ targets: dot, scale: 1.5, duration: 160, yoyo: true });
  }

  /** Which NPC the found scatter-hunt babies live beside afterwards. */
  scatterHomeNpc() {
    const c = this.zone.objects.chicks;
    return this.zone.npcs.find((n) => n.id === c?.homeNpcId) ?? this.zone.npcs[0];
  }

  /** Permanent world change: once found, the babies live beside their NPC. */
  restoreFoundChicks() {
    const c = this.zone.objects.chicks;
    if (!c || !fixtureOn(this.worldState, c.fixture)) return;
    const home = this.scatterHomeNpc();
    if (!home || !this.textures.exists("obj-chick")) return;
    c.spots.forEach((_, i) => {
      const chick = this.add
        .image(home.x + 70 + i * 34, home.y + 40, "obj-chick")
        .setScale(c.size / c.h)
        .setDepth(19);
      this.tweens.add({
        targets: chick,
        y: home.y + 34,
        duration: Phaser.Math.Between(500, 800),
        yoyo: true,
        repeat: -1,
      });
    });
  }

  spawnChicks() {
    const c = this.zone.objects.chicks;
    this.chickSprites = c.spots.map((spot) => {
      const chick = this.textures.exists("obj-chick")
        ? this.add.image(spot.x, spot.y, "obj-chick").setScale(c.size / c.h)
        : this.add.ellipse(spot.x, spot.y, 60, 60, 0xf9d977);
      chick.setDepth(20);
      this.tweens.add({
        targets: chick,
        y: spot.y - 8,
        duration: Phaser.Math.Between(500, 800),
        yoyo: true,
        repeat: -1,
      });
      return chick;
    });
    return this.chickSprites;
  }

  applyFixtureVisual(fixture) {
    if (fixture === "gateOpen" && this.gateSprite) {
      this.tweens.add({ targets: this.gateSprite, angle: -14, alpha: 0.85, duration: 700, ease: "Sine.easeInOut" });
      for (const dot of this.gateDots) dot.setFillStyle(0xf4b731, 1);
    }
    if (fixture === this.zone.objects.chicks?.fixture) {
      // The found babies trot home to their NPC.
      const home = this.scatterHomeNpc();
      this.chickSprites.forEach((chick, i) => {
        this.tweens.add({
          targets: chick,
          x: home.x + 70 + i * 34,
          y: home.y + 40,
          duration: 1400 + i * 150,
          ease: "Sine.easeInOut",
        });
      });
    }
  }
}
