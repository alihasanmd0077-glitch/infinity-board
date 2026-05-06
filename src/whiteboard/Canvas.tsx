import { useEffect, useRef, useState } from "react";
import { useWB, newId } from "./store";
import { freehandPath, pointInElement, screenToWorld } from "./utils";
import type { WBElement } from "./types";
import { ElementView } from "./ElementView";

type Action =
  | { kind: "none" }
  | { kind: "panning"; lastX: number; lastY: number }
  | { kind: "drawing"; id: string }
  | { kind: "creating"; id: string; startX: number; startY: number }
  | { kind: "moving"; ids: string[]; startX: number; startY: number; orig: Record<string, { x: number; y: number }> }
  | {
      kind: "resizing";
      id: string;
      handle: string;
      orig: WBElement;
    }
  | { kind: "rotating"; id: string; cx: number; cy: number; startAngle: number; origRot: number };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

export function Canvas() {
  const ref = useRef<SVGSVGElement>(null);
  const {
    elements, order, camera, tool, selectedIds, stroke, fill, strokeWidth, fontSize,
    addElement, updateElement, panBy, zoomAt, setSelected, setTool, deleteElements,
    pushHistory, undo, redo,
  } = useWB();
  const [action, setAction] = useState<Action>({ kind: "none" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId) return;
      const target = e.target as HTMLElement;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA"].includes(target?.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length) { pushHistory(); deleteElements(selectedIds); }
        return;
      }
      if (e.key === "Escape") { setSelected([]); setTool("select"); return; }
      const map: Record<string, string> = {
        v: "select", h: "pan", p: "pen", r: "rectangle", o: "ellipse",
        l: "line", a: "arrow", t: "text", s: "sticky", e: "eraser",
      };
      const t = map[e.key.toLowerCase()];
      if (t) setTool(t as never);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, editingId, undo, redo, deleteElements, setSelected, setTool, pushHistory]);

  // wheel zoom / trackpad pan
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        zoomAt(factor, e.clientX, e.clientY);
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [panBy, zoomAt]);

  const getWorld = (e: React.PointerEvent) => screenToWorld(e.clientX, e.clientY, camera);

  const onPointerDown = (e: React.PointerEvent) => {
    if (editingId) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x: wx, y: wy } = getWorld(e);
    const isMiddle = e.button === 1;
    const isSpace = (e as unknown as { altKey: boolean }).altKey;

    if (tool === "pan" || isMiddle || isSpace) {
      setAction({ kind: "panning", lastX: e.clientX, lastY: e.clientY });
      return;
    }

    if (tool === "select") {
      // test handles first
      const sel = selectedIds[0] ? elements[selectedIds[0]] : null;
      if (sel && selectedIds.length === 1) {
        const handle = hitHandle(wx, wy, sel, camera.zoom);
        if (handle) {
          pushHistory();
          if (handle === "rotate") {
            const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
            setAction({ kind: "rotating", id: sel.id, cx, cy, startAngle: Math.atan2(wy - cy, wx - cx), origRot: sel.rotation });
          } else {
            setAction({ kind: "resizing", id: sel.id, handle, orig: { ...sel } });
          }
          return;
        }
      }
      // hit element
      const hit = [...order].reverse().find((id) => pointInElement(wx, wy, elements[id]));
      if (hit) {
        let nextSel = selectedIds;
        if (e.shiftKey) nextSel = selectedIds.includes(hit) ? selectedIds.filter((i) => i !== hit) : [...selectedIds, hit];
        else if (!selectedIds.includes(hit)) nextSel = [hit];
        setSelected(nextSel);
        pushHistory();
        const orig: Record<string, { x: number; y: number }> = {};
        nextSel.forEach((id) => { orig[id] = { x: elements[id].x, y: elements[id].y }; });
        setAction({ kind: "moving", ids: nextSel, startX: wx, startY: wy, orig });
      } else {
        setSelected([]);
        setMarquee({ x: wx, y: wy, w: 0, h: 0 });
      }
      return;
    }

    if (tool === "eraser") {
      const hit = [...order].reverse().find((id) => pointInElement(wx, wy, elements[id]));
      if (hit) { pushHistory(); deleteElements([hit]); }
      return;
    }

    if (tool === "pen") {
      const id = newId();
      pushHistory();
      addElement({
        id, type: "freehand", x: wx, y: wy, w: 0, h: 0, rotation: 0, z: 0,
        stroke, fill: "transparent", strokeWidth, opacity: 1,
        points: [[0, 0, (e as unknown as { pressure: number }).pressure || 0.5]],
      });
      setAction({ kind: "drawing", id });
      return;
    }

    if (tool === "text" || tool === "sticky") {
      const id = newId();
      pushHistory();
      const isSticky = tool === "sticky";
      addElement({
        id, type: tool, x: wx, y: wy,
        w: isSticky ? 180 : 200, h: isSticky ? 180 : 40,
        rotation: 0, z: 0,
        stroke: isSticky ? "#1a1a2e" : stroke,
        fill: isSticky ? (fill !== "transparent" ? fill : "#fde68a") : "transparent",
        strokeWidth, opacity: 1,
        text: "", fontSize: isSticky ? 24 : fontSize, fontFamily: isSticky ? "Caveat" : "Inter",
      });
      setSelected([id]);
      setEditingId(id);
      setTool("select");
      return;
    }

    // shapes
    if (["rectangle", "ellipse", "line", "arrow"].includes(tool)) {
      const id = newId();
      pushHistory();
      addElement({
        id, type: tool as never, x: wx, y: wy, w: 0, h: 0, rotation: 0, z: 0,
        stroke, fill, strokeWidth, opacity: 1,
      });
      setAction({ kind: "creating", id, startX: wx, startY: wy });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x: wx, y: wy } = getWorld(e);
    if (action.kind === "panning") {
      panBy(e.clientX - action.lastX, e.clientY - action.lastY);
      setAction({ ...action, lastX: e.clientX, lastY: e.clientY });
      return;
    }
    if (action.kind === "drawing") {
      const el = elements[action.id];
      if (el?.type === "freehand") {
        const p: [number, number, number] = [
          wx - el.x, wy - el.y, (e as unknown as { pressure: number }).pressure || 0.5,
        ];
        updateElement(action.id, { points: [...el.points, p] } as never);
      }
      return;
    }
    if (action.kind === "creating") {
      const dx = wx - action.startX, dy = wy - action.startY;
      const el = elements[action.id];
      if (!el) return;
      if (el.type === "line" || el.type === "arrow") {
        updateElement(action.id, { w: dx, h: dy });
      } else {
        const x = Math.min(action.startX, wx);
        const y = Math.min(action.startY, wy);
        updateElement(action.id, { x, y, w: Math.abs(dx), h: Math.abs(dy) });
      }
      return;
    }
    if (action.kind === "moving") {
      const dx = wx - action.startX, dy = wy - action.startY;
      action.ids.forEach((id) => {
        const o = action.orig[id];
        updateElement(id, { x: o.x + dx, y: o.y + dy });
      });
      return;
    }
    if (action.kind === "resizing") {
      const o = action.orig;
      let { x, y, w, h } = o;
      const right = o.x + o.w, bottom = o.y + o.h;
      if (action.handle.includes("e")) w = wx - o.x;
      if (action.handle.includes("s")) h = wy - o.y;
      if (action.handle.includes("w")) { x = wx; w = right - wx; }
      if (action.handle.includes("n")) { y = wy; h = bottom - wy; }
      if (o.type !== "line" && o.type !== "arrow") {
        if (w < 0) { x = x + w; w = -w; }
        if (h < 0) { y = y + h; h = -h; }
      }
      updateElement(o.id, { x, y, w, h });
      return;
    }
    if (action.kind === "rotating") {
      const a = Math.atan2(wy - action.cy, wx - action.cx);
      let rot = action.origRot + (a - action.startAngle);
      if (e.shiftKey) rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
      updateElement(action.id, { rotation: rot });
      return;
    }
    if (marquee) {
      setMarquee({ x: marquee.x, y: marquee.y, w: wx - marquee.x, h: wy - marquee.y });
    }
  };

  const onPointerUp = () => {
    if (marquee) {
      const x1 = Math.min(marquee.x, marquee.x + marquee.w);
      const y1 = Math.min(marquee.y, marquee.y + marquee.h);
      const x2 = Math.max(marquee.x, marquee.x + marquee.w);
      const y2 = Math.max(marquee.y, marquee.y + marquee.h);
      const ids = order.filter((id) => {
        const el = elements[id];
        return el.x >= x1 && el.y >= y1 && el.x + el.w <= x2 && el.y + el.h <= y2;
      });
      if (ids.length) setSelected(ids);
      setMarquee(null);
    }
    if (action.kind === "creating") {
      const el = elements[action.id];
      if (el && Math.abs(el.w) < 3 && Math.abs(el.h) < 3) {
        deleteElements([action.id]);
      } else if (el) {
        setSelected([action.id]);
        setTool("select");
      }
    }
    setAction({ kind: "none" });
  };

  // cursor
  let cursor = "default";
  if (tool === "pan") cursor = "grab";
  else if (tool === "select") cursor = "default";
  else if (tool === "eraser") cursor = "crosshair";
  else cursor = "crosshair";
  if (action.kind === "panning") cursor = "grabbing";

  return (
    <svg
      ref={ref}
      className="absolute inset-0 h-full w-full touch-none"
      style={{ cursor, background: "radial-gradient(circle at 50% 50%, hsl(var(--background)), hsl(var(--canvas-bg)))" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Grid />
      <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
        {order.map((id) => {
          const el = elements[id];
          if (!el) return null;
          return (
            <ElementView
              key={id}
              el={el}
              selected={selectedIds.includes(id)}
              editing={editingId === id}
              onStartEdit={(eid) => { setSelected([eid]); setEditingId(eid); setTool("select"); }}
              onTextChange={(eid, text) => {
                updateElement(eid, { text } as never);
                setEditingId(null);
              }}
            />
          );
        })}

        {selectedIds.length === 1 && elements[selectedIds[0]] && (
          <SelectionUI el={elements[selectedIds[0]]} zoom={camera.zoom} />
        )}
        {selectedIds.length > 1 && (
          <MultiSelectionBox ids={selectedIds} elements={elements} />
        )}

        {marquee && (
          <rect
            x={Math.min(marquee.x, marquee.x + marquee.w)}
            y={Math.min(marquee.y, marquee.y + marquee.h)}
            width={Math.abs(marquee.w)}
            height={Math.abs(marquee.h)}
            fill="hsl(var(--primary) / 0.08)"
            stroke="hsl(var(--primary))"
            strokeWidth={1 / camera.zoom}
            strokeDasharray={`${4 / camera.zoom} ${4 / camera.zoom}`}
          />
        )}
      </g>
    </svg>
  );
}

function Grid() {
  const { camera } = useWB();
  const size = 24 * camera.zoom;
  const ox = camera.x % size;
  const oy = camera.y % size;
  return (
    <>
      <defs>
        <pattern id="grid" width={size} height={size} patternUnits="userSpaceOnUse" x={ox} y={oy}>
          <circle cx={0.5} cy={0.5} r={0.8} fill="hsl(var(--canvas-grid))" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </>
  );
}

function hitHandle(wx: number, wy: number, el: WBElement, zoom: number): string | null {
  const s = 10 / zoom;
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  // unrotate point
  const c = Math.cos(-el.rotation), si = Math.sin(-el.rotation);
  const dx = wx - cx, dy = wy - cy;
  const lx = cx + dx * c - dy * si;
  const ly = cy + dx * si + dy * c;
  // rotation handle
  const rotY = el.y - 24 / zoom;
  if (Math.hypot(lx - cx, ly - rotY) < s) return "rotate";
  const pts: Record<string, [number, number]> = {
    nw: [el.x, el.y], n: [cx, el.y], ne: [el.x + el.w, el.y],
    e: [el.x + el.w, cy], se: [el.x + el.w, el.y + el.h],
    s: [cx, el.y + el.h], sw: [el.x, el.y + el.h], w: [el.x, cy],
  };
  for (const [k, [px, py]] of Object.entries(pts)) {
    if (Math.abs(lx - px) < s && Math.abs(ly - py) < s) return k;
  }
  return null;
}

function SelectionUI({ el, zoom }: { el: WBElement; zoom: number }) {
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  const transform = `rotate(${(el.rotation * 180) / Math.PI} ${cx} ${cy})`;
  const s = 8 / zoom;
  const sw = 1.5 / zoom;
  const handles: Record<string, [number, number]> = {
    nw: [el.x, el.y], n: [cx, el.y], ne: [el.x + el.w, el.y],
    e: [el.x + el.w, cy], se: [el.x + el.w, el.y + el.h],
    s: [cx, el.y + el.h], sw: [el.x, el.y + el.h], w: [el.x, cy],
  };
  return (
    <g transform={transform} style={{ pointerEvents: "none" }}>
      <rect
        x={el.x} y={el.y} width={el.w} height={el.h}
        fill="hsl(var(--primary) / 0.05)" stroke="hsl(var(--primary) / 0.8)" strokeWidth={sw}
      />
      <line x1={cx} y1={el.y} x2={cx} y2={el.y - 24 / zoom} stroke="hsl(var(--primary) / 0.8)" strokeWidth={sw} />
      <circle cx={cx} cy={el.y - 24 / zoom} r={s * 0.7} fill="white" stroke="hsl(var(--primary))" strokeWidth={sw} />
      {HANDLES.map((h) => {
        const [x, y] = handles[h];
        return (
          <rect
            key={h}
            x={x - s / 2} y={y - s / 2} width={s} height={s}
            fill="white" stroke="hsl(var(--primary))" strokeWidth={sw}
            rx={1 / zoom}
          />
        );
      })}
    </g>
  );
}

function MultiSelectionBox({ ids, elements }: { ids: string[]; elements: Record<string, WBElement> }) {
  const els = ids.map((id) => elements[id]).filter(Boolean);
  if (!els.length) return null;
  const x1 = Math.min(...els.map((e) => e.x));
  const y1 = Math.min(...els.map((e) => e.y));
  const x2 = Math.max(...els.map((e) => e.x + e.w));
  const y2 = Math.max(...els.map((e) => e.y + e.h));
  return (
    <rect
      x={x1} y={y1} width={x2 - x1} height={y2 - y1}
      fill="hsl(var(--primary) / 0.05)"
      stroke="hsl(var(--primary))" strokeWidth={1.5}
      strokeDasharray="6 4"
      style={{ pointerEvents: "none" }}
    />
  );
}
