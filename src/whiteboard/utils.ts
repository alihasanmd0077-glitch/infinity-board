import { getStroke } from "perfect-freehand";
import type { WBElement } from "./types";

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"] as (string | number)[]
  );
  d.push("Z");
  return d.join(" ");
}

export function freehandPath(points: [number, number, number][], size: number) {
  const stroke = getStroke(points, {
    size,
    thinning: 0.55,
    smoothing: 0.6,
    streamline: 0.55,
    easing: (t) => t,
    simulatePressure: points.every((p) => p[2] === 0.5),
  });
  return getSvgPathFromStroke(stroke);
}

export function screenToWorld(
  sx: number,
  sy: number,
  cam: { x: number; y: number; zoom: number }
) {
  return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
}

export function getBounds(el: WBElement) {
  return { x: el.x, y: el.y, w: el.w, h: el.h, cx: el.x + el.w / 2, cy: el.y + el.h / 2 };
}

export function rotatePoint(px: number, py: number, cx: number, cy: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  const dx = px - cx, dy = py - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

export function pointInElement(wx: number, wy: number, el: WBElement): boolean {
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  const p = rotatePoint(wx, wy, cx, cy, -el.rotation);
  if (el.type === "line" || el.type === "arrow") {
    // distance from segment from (x,y) to (x+w,y+h)
    const x1 = el.x, y1 = el.y, x2 = el.x + el.w, y2 = el.y + el.h;
    const A = p.x - x1, B = p.y - y1, C = x2 - x1, D = y2 - y1;
    const len2 = C * C + D * D || 1;
    const t = Math.max(0, Math.min(1, (A * C + B * D) / len2));
    const dx = x1 + t * C - p.x, dy = y1 + t * D - p.y;
    return Math.hypot(dx, dy) < 8 + el.strokeWidth;
  }
  return p.x >= el.x && p.x <= el.x + el.w && p.y >= el.y && p.y <= el.y + el.h;
}
