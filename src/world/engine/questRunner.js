import { sfx } from "../worldAudio";
import { starBurst } from "./juice";

/**
 * Interprets a zone's quest step DSL (see zones/meadowZone.js) against the
 * built fixtures, and talks to the DOM dialog over game.events:
 *   scene → 'dialog' {speaker, portrait, line, options?, hint, stars?}
 *   scene → 'dialog-close', 'pick-wrong', 'pick-right'
 *   react → 'dialog-next', 'dialog-pick' {value}
 * A wrong pick wobbles and re-asks: it costs time, never progress.
 */
export class QuestRunner {
  constructor(scene, { fixturesFor, onCelebrate, onEnd, focus, release }) {
    this.scene = scene;
    this.fixturesFor = fixturesFor;
    this.onCelebrate = onCelebrate;
    this.onEnd = onEnd;
    this.focus = focus;
    this.release = release;
    this.active = null;
    this.stepIndex = 0;
    this.npc = null;
    this.zone = null;
    this.armed = null;

    this.onNext = () => this.next();
    this.onPick = (value) => this.pick(value);
    scene.game.events.on("dialog-next", this.onNext);
    scene.game.events.on("dialog-pick", this.onPick);
  }

  get isActive() {
    return Boolean(this.active);
  }

  speaker() {
    if (this.npc) return { speaker: this.npc.def.name, portrait: this.npc.def.bird };
    return { speaker: "Skylark", portrait: "skylark" };
  }

  emitDialog(extra) {
    this.scene.game.events.emit("dialog", { ...this.speaker(), ...extra });
  }

  start(zone, quest, npc) {
    if (this.active) return;
    this.zone = zone;
    this.active = quest;
    this.npc = npc;
    this.stepIndex = 0;
    this.hinted = false;
    this.runStep();
  }

  step() {
    return this.active?.steps[this.stepIndex] ?? null;
  }

  targetFixture(step) {
    const f = this.fixturesFor(this.zone.id);
    if (step.type === "countTap") return step.targets === "chicks" ? f.chicks : f.bridge;
    if (step.type === "placeItems") return f[step.target];
    return null;
  }

  runStep() {
    const step = this.step();
    if (!step) return this.end();
    this.disarm();
    switch (step.type) {
      case "talk": {
        if (this.npc) this.focus(this.npc.x, this.npc.y, 1.15);
        this.emitDialog({ line: step.line, hint: "next" });
        break;
      }
      case "countTap": {
        const fx = this.targetFixture(step);
        // Look at the thing, then let the camera follow the kid — a hunt
        // means walking, and every play step allows it.
        if (step.targets === "chicks") this.glance(fx.anchor.x, fx.anchor.y, 900);
        else this.focus(fx.anchor.x, fx.anchor.y, 1.0);
        this.emitDialog({ line: step.line, hint: "play" });
        this.armed = fx;
        fx.armCounting(null, () => this.advance());
        break;
      }
      case "pickNumber": {
        this.emitDialog({ line: step.line, options: step.options, hint: "pick", hintable: Boolean(step.hint) });
        break;
      }
      case "placeItems": {
        const fx = this.targetFixture(step);
        this.focus(fx.anchor.x, fx.anchor.y, 1.0);
        this.emitDialog({ line: step.line, hint: "play" });
        this.armed = fx;
        fx.armPlacing(null, () => this.advance(), step.count);
        break;
      }
      case "celebrate": {
        const f = this.fixturesFor(this.zone.id) ?? {};
        const fx = step.fixture ? Object.values(f).find((h) => h && h.fixture === step.fixture) : null;
        const at = fx?.anchor ?? (this.npc ? { x: this.npc.x, y: this.npc.y - 60 } : { x: 0, y: 0 });
        this.onCelebrate?.(this.active, step, fx);
        fx?.complete?.(false);
        starBurst(this.scene, at.x, at.y - 40, step.stars);
        sfx.stars(step.stars);
        this.npc?.cheer();
        this.scene.avatar?.cheer();
        if (this.npc) this.focus(this.npc.x, this.npc.y, 1.12);
        this.scene.time.delayedCall(500, () => this.emitDialog({ line: step.line, hint: "done", stars: step.stars }));
        break;
      }
      default:
        this.advance();
    }
  }

  /** True while the kid may walk: the play steps (counting, placing). */
  allowsWalking() {
    const t = this.step()?.type;
    return t === "countTap" || t === "placeItems";
  }

  /** Pan to a point, hold, then hand the camera back to the skylark. */
  glance(x, y, hold = 1400) {
    this.focus(x, y, 1.0);
    this.glanceTimer?.remove();
    this.glanceTimer = this.scene.time.delayedCall(hold, () => {
      if (this.active && this.allowsWalking()) this.release();
    });
  }

  disarm() {
    this.armed?.clear?.();
    this.armed = null;
  }

  advance() {
    if (!this.active) return;
    this.stepIndex += 1;
    this.hinted = false;
    this.runStep();
  }

  /** ▶ / ✓ from the dialog. */
  next() {
    const step = this.step();
    if (!step) return;
    if (step.type === "talk") this.advance();
    else if (step.type === "celebrate") this.end();
  }

  pick(value) {
    const step = this.step();
    if (!step || step.type !== "pickNumber") return;
    if (value === step.answer) {
      sfx.chime();
      this.scene.game.events.emit("pick-right", value);
      this.scene.time.delayedCall(550, () => this.advance());
    } else {
      sfx.wobble();
      this.scene.game.events.emit("pick-wrong", value);
      // Show, don't tell: count the relevant things out loud, once per step.
      if (step.hint && !this.hinted) {
        this.hinted = true;
        const fx = this.fixturesFor(this.zone.id)?.[step.hint.target];
        if (fx?.hint) {
          this.scene.time.delayedCall(700, () => {
            this.focus(fx.anchor.x, fx.anchor.y, 1.0);
            const total = fx.hint(step.hint.mode);
            this.scene.time.delayedCall(total * 420 + 500, () => {
              this.scene.game.events.emit("hint-done", total);
            });
          });
        }
      }
    }
  }

  end() {
    const quest = this.active;
    const npc = this.npc;
    this.glanceTimer?.remove();
    this.disarm();
    this.active = null;
    this.npc = null;
    this.scene.game.events.emit("dialog-close");
    this.release();
    this.onEnd?.(quest, npc);
  }

  destroy() {
    this.scene.game.events.off("dialog-next", this.onNext);
    this.scene.game.events.off("dialog-pick", this.onPick);
  }
}
