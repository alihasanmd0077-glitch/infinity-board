import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Camera, Tool, WBElement } from "./types";

interface HistoryEntry {
  elements: Record<string, WBElement>;
  order: string[];
}

interface WBState {
  tool: Tool;
  elements: Record<string, WBElement>;
  order: string[]; // z-order, last = top
  selectedIds: string[];
  camera: Camera;
  stroke: string;
  fill: string;
  strokeWidth: number;
  fontSize: number;
  history: HistoryEntry[];
  future: HistoryEntry[];

  setTool: (t: Tool) => void;
  setStroke: (c: string) => void;
  setFill: (c: string) => void;
  setStrokeWidth: (n: number) => void;
  setFontSize: (n: number) => void;
  setCamera: (c: Camera) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, cx: number, cy: number) => void;

  addElement: (el: WBElement) => void;
  updateElement: (id: string, patch: Partial<WBElement>) => void;
  updateElements: (updates: { id: string; patch: Partial<WBElement> }[]) => void;
  deleteElements: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  setSelected: (ids: string[]) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
}

const snapshot = (s: WBState): HistoryEntry => ({
  elements: JSON.parse(JSON.stringify(s.elements)),
  order: [...s.order],
});

export const useWB = create<WBState>((set, get) => ({
  tool: "select",
  elements: {},
  order: [],
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  stroke: "#1a1a2e",
  fill: "transparent",
  strokeWidth: 2,
  fontSize: 18,
  history: [],
  future: [],

  setTool: (tool) => set({ tool, selectedIds: tool === "select" ? get().selectedIds : [] }),
  setStroke: (stroke) => {
    set({ stroke });
    const { selectedIds } = get();
    if (selectedIds.length) get().updateElements(selectedIds.map((id) => ({ id, patch: { stroke } })));
  },
  setFill: (fill) => {
    set({ fill });
    const { selectedIds } = get();
    if (selectedIds.length) get().updateElements(selectedIds.map((id) => ({ id, patch: { fill } })));
  },
  setStrokeWidth: (strokeWidth) => {
    set({ strokeWidth });
    const { selectedIds } = get();
    if (selectedIds.length) get().updateElements(selectedIds.map((id) => ({ id, patch: { strokeWidth } })));
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    const { selectedIds, elements } = get();
    const ups = selectedIds
      .filter((id) => elements[id]?.type === "text" || elements[id]?.type === "sticky")
      .map((id) => ({ id, patch: { fontSize } as Partial<WBElement> }));
    if (ups.length) get().updateElements(ups);
  },

  setCamera: (camera) => set({ camera }),
  panBy: (dx, dy) =>
    set((s) => ({ camera: { ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy } })),
  zoomAt: (factor, cx, cy) =>
    set((s) => {
      const zoom = Math.max(0.1, Math.min(8, s.camera.zoom * factor));
      const k = zoom / s.camera.zoom;
      return {
        camera: {
          zoom,
          x: cx - (cx - s.camera.x) * k,
          y: cy - (cy - s.camera.y) * k,
        },
      };
    }),

  addElement: (el) =>
    set((s) => ({
      elements: { ...s.elements, [el.id]: el },
      order: [...s.order, el.id],
    })),

  updateElement: (id, patch) =>
    set((s) =>
      s.elements[id]
        ? { elements: { ...s.elements, [id]: { ...s.elements[id], ...patch } as WBElement } }
        : s
    ),

  updateElements: (updates) =>
    set((s) => {
      const elements = { ...s.elements };
      for (const { id, patch } of updates) {
        if (elements[id]) elements[id] = { ...elements[id], ...patch } as WBElement;
      }
      return { elements };
    }),

  deleteElements: (ids) =>
    set((s) => {
      const elements = { ...s.elements };
      ids.forEach((id) => delete elements[id]);
      return {
        elements,
        order: s.order.filter((id) => !ids.includes(id)),
        selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
      };
    }),

  bringForward: (ids) =>
    set((s) => {
      const order = [...s.order];
      for (let i = order.length - 2; i >= 0; i--) {
        if (ids.includes(order[i]) && !ids.includes(order[i + 1])) {
          [order[i], order[i + 1]] = [order[i + 1], order[i]];
        }
      }
      return { order };
    }),
  sendBackward: (ids) =>
    set((s) => {
      const order = [...s.order];
      for (let i = 1; i < order.length; i++) {
        if (ids.includes(order[i]) && !ids.includes(order[i - 1])) {
          [order[i], order[i - 1]] = [order[i - 1], order[i]];
        }
      }
      return { order };
    }),
  bringToFront: (ids) =>
    set((s) => ({ order: [...s.order.filter((id) => !ids.includes(id)), ...ids] })),
  sendToBack: (ids) =>
    set((s) => ({ order: [...ids, ...s.order.filter((id) => !ids.includes(id))] })),

  setSelected: (selectedIds) => set({ selectedIds }),

  pushHistory: () =>
    set((s) => ({ history: [...s.history.slice(-50), snapshot(s)], future: [] })),
  undo: () =>
    set((s) => {
      if (!s.history.length) return s;
      const prev = s.history[s.history.length - 1];
      return {
        history: s.history.slice(0, -1),
        future: [snapshot(s), ...s.future],
        elements: prev.elements,
        order: prev.order,
        selectedIds: [],
      };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return {
        future: s.future.slice(1),
        history: [...s.history, snapshot(s)],
        elements: next.elements,
        order: next.order,
        selectedIds: [],
      };
    }),
  clearAll: () => {
    get().pushHistory();
    set({ elements: {}, order: [], selectedIds: [] });
  },
}));

export const newId = () => nanoid(10);
