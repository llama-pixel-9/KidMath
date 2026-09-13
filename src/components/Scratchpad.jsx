import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The work space: a finger / Apple Pencil / mouse canvas for working a
 * problem out. Pen, three ink colors, eraser, undo, clear.
 *
 * - Pointer events only (`touch-action: none`), so pen, touch and mouse all
 *   draw; coalesced events keep fast pen strokes smooth.
 * - Pencil pressure widens the line a little; finger/mouse draw a fixed
 *   width.
 * - Palm rejection: once a pen has touched, touch pointers are ignored for
 *   a moment so a resting hand does not scribble.
 * - Strokes are kept as data so undo and a resize (rotation, pane open)
 *   redraw cleanly at device pixel ratio.
 * - The session mounts it keyed by the question, so a new question is a
 *   clean page.
 */

const INKS = [
  { id: "ink", label: "Ink", color: "#14231F" },
  { id: "teal", label: "Teal", color: "#0B7A6A" },
  { id: "ember", label: "Ember", color: "#C4471B" },
];
const PEN_WIDTH = 3.2;
const ERASER_WIDTH = 26;
const PALM_WINDOW_MS = 1500;

function strokeWidth(tool, pointerType, pressure) {
  if (tool === "eraser") return ERASER_WIDTH;
  if (pointerType === "pen" && pressure > 0) return PEN_WIDTH * (0.6 + pressure * 1.2);
  return PEN_WIDTH;
}

function drawStroke(ctx, stroke) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.lineWidth = pts[0].w;
    ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
  } else {
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath();
      ctx.lineWidth = (pts[i - 1].w + pts[i].w) / 2;
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export default function Scratchpad() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const strokesRef = useRef([]);
  const liveRef = useRef(null); // the stroke under the pointer
  const lastPenAtRef = useRef(0);
  const [tool, setTool] = useState("pen");
  const [ink, setInk] = useState(INKS[0].id);
  const [strokeCount, setStrokeCount] = useState(0);
  const [drawing, setDrawing] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of strokesRef.current) drawStroke(ctx, s);
    if (liveRef.current) drawStroke(ctx, liveRef.current);
  }, []);

  // Size the bitmap to the pane at device pixels; redraw on any resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = wrap.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  const pointOf = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: strokeWidth(tool, e.pointerType, e.pressure) };
  };

  const ignoreForPalm = (e) => e.pointerType === "touch" && Date.now() - lastPenAtRef.current < PALM_WINDOW_MS;

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0 && e.pointerType === "mouse") return;
    if (e.pointerType === "pen") lastPenAtRef.current = Date.now();
    if (ignoreForPalm(e)) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const color = tool === "eraser" ? "#000" : INKS.find((i) => i.id === ink)?.color || INKS[0].color;
    liveRef.current = { tool, color, pointerId: e.pointerId, points: [pointOf(e)] };
    setDrawing(true);
    drawStroke(canvasRef.current.getContext("2d"), liveRef.current);
  };

  const onPointerMove = (e) => {
    const live = liveRef.current;
    if (!live || live.pointerId !== e.pointerId) return;
    if (e.pointerType === "pen") lastPenAtRef.current = Date.now();
    e.preventDefault();
    const events = typeof e.nativeEvent?.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [e];
    const ctx = canvasRef.current.getContext("2d");
    for (const ev of events.length ? events : [e]) {
      const p = pointOf(ev.pointerType ? ev : e);
      const prev = live.points[live.points.length - 1];
      live.points.push(p);
      drawStroke(ctx, { ...live, points: [prev, p] });
    }
  };

  const endStroke = (e) => {
    const live = liveRef.current;
    if (!live || live.pointerId !== e.pointerId) return;
    liveRef.current = null;
    setDrawing(false);
    strokesRef.current = [...strokesRef.current, live];
    setStrokeCount(strokesRef.current.length);
    canvasRef.current.releasePointerCapture?.(e.pointerId);
  };

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redraw();
  };

  const clear = () => {
    strokesRef.current = [];
    liveRef.current = null;
    setStrokeCount(0);
    redraw();
  };

  const toolBtn = (active) =>
    `h-10 min-w-10 px-3 rounded-xl font-bold text-sm cursor-pointer btn-press flex items-center justify-center gap-1.5 ${
      active ? "bg-ink text-cream" : "bg-cream text-ink hover:bg-seafoam/40"
    }`;

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="scratchpad">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink/10 shrink-0 flex-wrap" role="toolbar" aria-label="Drawing tools">
        <button type="button" className={toolBtn(tool === "pen")} onClick={() => setTool("pen")} aria-pressed={tool === "pen"} aria-label="Pen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></svg>
          <span className="hidden sm:inline">Pen</span>
        </button>
        <div className="flex items-center gap-1.5" role="group" aria-label="Ink color">
          {INKS.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-label={i.label}
              aria-pressed={tool === "pen" && ink === i.id}
              onClick={() => {
                setInk(i.id);
                setTool("pen");
              }}
              className={`w-8 h-8 rounded-full cursor-pointer border-[3px] ${tool === "pen" && ink === i.id ? "border-ink scale-110" : "border-white"} shadow`}
              style={{ backgroundColor: i.color }}
            />
          ))}
        </div>
        <button type="button" className={toolBtn(tool === "eraser")} onClick={() => setTool("eraser")} aria-pressed={tool === "eraser"} aria-label="Eraser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 7" /><path d="M6 11l7 7" /></svg>
          <span className="hidden sm:inline">Eraser</span>
        </button>
        <span className="flex-1" />
        <button type="button" className={toolBtn(false)} onClick={undo} disabled={strokeCount === 0} aria-label="Undo last stroke">
          Undo
        </button>
        <button type="button" className={toolBtn(false)} onClick={clear} disabled={strokeCount === 0} aria-label="Clear the page">
          Clear
        </button>
      </div>
      <div ref={wrapRef} className="flex-1 min-h-0 relative bg-graph-paper">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none select-none cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Work space. Draw with your finger, a pencil, or the mouse."
          role="img"
        />
        {strokeCount === 0 && !drawing && (
          <p className="absolute inset-x-0 top-6 text-center text-sm font-bold text-ink/35 pointer-events-none select-none m-0">
            Work it out here
          </p>
        )}
      </div>
    </div>
  );
}
