/**
 * Small procedural textures the world draws with (particles, dots, glows).
 * Generated once at boot from Graphics so nothing extra ships in public/.
 * Brand rule: the reward star is the Sun DIAMOND (a rotated square), never a
 * five-point star.
 */
export const SUN = 0xf26b3a;
export const EMBER = 0xc4471b;
export const INK = 0x14231f;
export const CREAM = 0xfffbeb;
export const TEAL = 0x0b7a6a;
export const MINT = 0x4fd1bc;
export const SEAFOAM = 0xa7ded3;
export const APRICOT = 0xfbc7a8;
export const PEACH = 0xffb088;
export const WOOD = 0xb98a5f;
export const WOOD_DARK = 0x8a5f3a;
export const WOOD_LIGHT = 0xd9b48a;

export function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const gen = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw(g, w, h);
    g.generateTexture(key, w, h);
  };

  // The Sun diamond — the star currency everywhere in larkit.
  gen("diamond", 32, 32, (gr) => {
    gr.fillStyle(SUN, 1);
    gr.fillPoints(
      [
        { x: 16, y: 1 },
        { x: 31, y: 16 },
        { x: 16, y: 31 },
        { x: 1, y: 16 },
      ],
      true,
    );
    gr.fillStyle(0xffd6b8, 0.9);
    gr.fillPoints(
      [
        { x: 16, y: 7 },
        { x: 21, y: 13 },
        { x: 14, y: 15 },
        { x: 10, y: 12 },
      ],
      true,
    );
  });

  // Soft round puff for dust, mist, and glows.
  gen("puff", 64, 64, (gr) => {
    for (let r = 32, a = 0.05; r > 4; r -= 3, a += 0.06) {
      gr.fillStyle(0xffffff, Math.min(1, a));
      gr.fillCircle(32, 32, r);
    }
  });

  gen("dot", 16, 16, (gr) => {
    gr.fillStyle(0xffffff, 1);
    gr.fillCircle(8, 8, 8);
  });

  // Four-point sparkle.
  gen("sparkle", 24, 24, (gr) => {
    gr.fillStyle(0xffffff, 1);
    gr.fillPoints(
      [
        { x: 12, y: 0 },
        { x: 14.5, y: 9.5 },
        { x: 24, y: 12 },
        { x: 14.5, y: 14.5 },
        { x: 12, y: 24 },
        { x: 9.5, y: 14.5 },
        { x: 0, y: 12 },
        { x: 9.5, y: 9.5 },
      ],
      true,
    );
  });

  gen("heart", 24, 22, (gr) => {
    gr.fillStyle(SUN, 1);
    gr.fillCircle(7, 7, 7);
    gr.fillCircle(17, 7, 7);
    gr.fillTriangle(0.5, 9, 23.5, 9, 12, 22);
  });

  gen("leaf", 18, 10, (gr) => {
    gr.fillStyle(0xd98b3a, 1);
    gr.fillEllipse(9, 5, 18, 9);
    gr.lineStyle(1, 0xa8641f, 0.8);
    gr.lineBetween(1, 5, 17, 5);
  });

  gen("seed", 14, 18, (gr) => {
    gr.fillStyle(0xd9a441, 1);
    gr.fillEllipse(7, 9, 12, 17);
    gr.fillStyle(0xf4d27a, 0.9);
    gr.fillEllipse(5, 6, 4, 6);
  });

  gen("berry", 16, 16, (gr) => {
    gr.fillStyle(0xc94f6d, 1);
    gr.fillCircle(8, 8, 7.5);
    gr.fillStyle(0xf2a1b6, 0.9);
    gr.fillCircle(5.5, 5.5, 2.5);
  });

  gen("acorn", 16, 20, (gr) => {
    gr.fillStyle(0xb98a5f, 1);
    gr.fillEllipse(8, 12, 12, 14);
    gr.fillStyle(0x8a5f3a, 1);
    gr.fillEllipse(8, 5, 14, 8);
    gr.fillRect(7, 0, 2, 4);
  });

  gen("stone", 40, 28, (gr) => {
    gr.fillStyle(0x7f8c99, 1);
    gr.fillEllipse(20, 15, 38, 24);
    gr.fillStyle(0xa9b4bf, 1);
    gr.fillEllipse(18, 12, 30, 16);
    gr.fillStyle(0xc9d2da, 0.8);
    gr.fillEllipse(14, 9, 12, 6);
  });

  // A wide soft cloud for the mist and the sky.
  gen("cloud", 160, 90, (gr) => {
    gr.fillStyle(0xffffff, 0.16);
    gr.fillEllipse(80, 60, 160, 56);
    gr.fillStyle(0xffffff, 0.34);
    gr.fillEllipse(60, 50, 96, 60);
    gr.fillEllipse(105, 44, 86, 64);
    gr.fillStyle(0xffffff, 0.55);
    gr.fillEllipse(78, 52, 70, 44);
  });

  // Fluffy painted sky cloud (matches the backdrops' cream clouds).
  gen("skycloud", 220, 80, (gr) => {
    gr.fillStyle(0xfff6e0, 1);
    gr.fillEllipse(110, 58, 210, 40);
    gr.fillCircle(70, 45, 32);
    gr.fillCircle(115, 34, 38);
    gr.fillCircle(160, 46, 30);
  });

  gen("sunglow", 256, 256, (gr) => {
    for (let r = 128, a = 0.02; r > 20; r -= 8, a += 0.018) {
      gr.fillStyle(0xfff1c2, Math.min(0.5, a));
      gr.fillCircle(128, 128, r);
    }
  });

  // Ten-frame dot: lit (Sun) and dark.
  gen("tfdot-on", 34, 34, (gr) => {
    gr.fillStyle(SUN, 1);
    gr.fillCircle(17, 17, 15);
    gr.fillStyle(0xffd6b8, 0.85);
    gr.fillCircle(12, 12, 5);
  });
  gen("tfdot-off", 34, 34, (gr) => {
    gr.fillStyle(0xe7d9bc, 1);
    gr.fillCircle(17, 17, 15);
    gr.lineStyle(2, 0xb99e78, 1);
    gr.strokeCircle(17, 17, 14);
  });

  // Blade of grass for the foreground sway layer.
  gen("blade", 22, 46, (gr) => {
    gr.fillStyle(0x4f9f68, 1);
    gr.fillTriangle(2, 46, 20, 46, 8, 0);
    gr.fillStyle(0x62b57a, 1);
    gr.fillTriangle(9, 46, 22, 46, 18, 8);
  });

  // Butterfly wing (one side); the container flips the other.
  gen("wing", 26, 22, (gr) => {
    gr.fillStyle(0xffffff, 1);
    gr.fillEllipse(15, 8, 22, 15);
    gr.fillEllipse(12, 16, 16, 11);
  });

  gen("ripple", 60, 12, (gr) => {
    gr.lineStyle(2, 0xffffff, 0.8);
    gr.beginPath();
    gr.moveTo(2, 6);
    gr.lineTo(58, 6);
    gr.strokePath();
  });

  g.destroy();
}
