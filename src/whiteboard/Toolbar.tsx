import { useWB } from "./store";
import type { Tool } from "./types";
import {
  MousePointer2, Hand, Pen, Square, Circle, Minus, ArrowRight,
  Type, StickyNote, Eraser, Undo2, Redo2, Trash2, ZoomIn, ZoomOut,
  Maximize2, Layers, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS: { tool: Tool; icon: React.ComponentType<{ className?: string }>; label: string; shortcut: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { tool: "pan", icon: Hand, label: "Pan", shortcut: "H" },
  { tool: "pen", icon: Pen, label: "Pen", shortcut: "P" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { tool: "line", icon: Minus, label: "Line", shortcut: "L" },
  { tool: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "A" },
  { tool: "text", icon: Type, label: "Text", shortcut: "T" },
  { tool: "sticky", icon: StickyNote, label: "Sticky", shortcut: "S" },
  { tool: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

export function Toolbar() {
  const { tool, setTool, undo, redo, clearAll, history, future } = useWB();

  return (
    <div className="pointer-events-auto fixed left-1/2 top-2 sm:top-5 z-30 -translate-x-1/2 max-w-[calc(100vw-1rem)] sm:max-w-none">
      <div className="glass-panel flex items-center gap-1 rounded-2xl p-1.5 overflow-x-auto no-scrollbar">
        {TOOLS.map(({ tool: t, icon: Icon, label, shortcut }) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            title={`${label} (${shortcut})`}
            className={cn(
              "group relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-smooth active:scale-95",
              tool === t
                ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)_/_0.4)] scale-105"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
        <div className="mx-1 h-7 w-px shrink-0 bg-border" />
        <button
          onClick={undo}
          disabled={!history.length}
          title="Undo (⌘Z)"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground disabled:opacity-30 active:scale-95"
        >
          <Undo2 className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={redo}
          disabled={!future.length}
          title="Redo (⌘⇧Z)"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground disabled:opacity-30 active:scale-95"
        >
          <Redo2 className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={() => confirm("Clear the whole board?") && clearAll()}
          title="Clear board"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

const PALETTE = [
  "#1a1a2e", "#ffffff", "#ef4444", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ec4899",
];
const STICKY_COLORS = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#fed7aa"];

export function StylePanel() {
  const { stroke, fill, strokeWidth, fontSize, setStroke, setFill, setStrokeWidth, setFontSize, tool, selectedIds, elements } =
    useWB();
  const sel = selectedIds.map((id) => elements[id]).filter(Boolean);
  const showText = tool === "text" || tool === "sticky" || sel.some((e) => e?.type === "text" || e?.type === "sticky");
  const isSticky = tool === "sticky" || sel.some((e) => e?.type === "sticky");

  return (
    <div className="pointer-events-auto fixed left-2 top-20 sm:left-5 sm:top-1/2 z-20 sm:-translate-y-1/2 origin-top-left scale-90 sm:scale-100">
      <div className="glass-panel flex w-56 flex-col gap-4 rounded-2xl p-4 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isSticky ? "Sticky color" : "Stroke"}
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {(isSticky ? STICKY_COLORS : PALETTE).map((c) => (
              <button
                key={c}
                onClick={() => (isSticky ? setFill(c) : setStroke(c))}
                className={cn(
                  "h-6 w-6 rounded-md border border-border/60 transition-transform hover:scale-110 active:scale-95",
                  ((isSticky ? fill : stroke) === c) && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-[0_0_12px_hsl(var(--primary)_/_0.4)]"
                )}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {!isSticky && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fill</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setFill("transparent")}
                className={cn(
                  "h-6 w-6 rounded-md border border-border/60 bg-[conic-gradient(from_0deg,#ddd,#fff,#ddd,#fff)] active:scale-95",
                  fill === "transparent" && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
                title="No fill"
              />
              {PALETTE.slice(2).map((c) => (
                <button
                  key={c}
                  onClick={() => setFill(c)}
                  className={cn(
                    "h-6 w-6 rounded-md border border-border/60 transition-transform hover:scale-110 active:scale-95",
                    fill === c && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-[0_0_12px_hsl(var(--primary)_/_0.4)]"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Stroke width</span>
            <span className="text-foreground">{strokeWidth}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {showText && (
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Font size</span>
              <span className="text-foreground">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={72}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        )}

        {sel.length > 0 && <LayerControls />}
      </div>
    </div>
  );
}

function LayerControls() {
  const { selectedIds, bringForward, sendBackward, bringToFront, sendToBack, deleteElements, pushHistory } = useWB();
  const wrap = (fn: (ids: string[]) => void) => () => {
    pushHistory();
    fn(selectedIds);
  };
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Layers className="h-3 w-3" /> Layer
      </div>
      <div className="grid grid-cols-4 gap-1">
        <button onClick={wrap(bringToFront)} title="To front" className="grid h-9 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-smooth active:scale-95">
          <ChevronsUp className="h-4 w-4" />
        </button>
        <button onClick={wrap(bringForward)} title="Forward" className="grid h-9 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-smooth active:scale-95">
          <ArrowUp className="h-4 w-4" />
        </button>
        <button onClick={wrap(sendBackward)} title="Backward" className="grid h-9 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-smooth active:scale-95">
          <ArrowDown className="h-4 w-4" />
        </button>
        <button onClick={wrap(sendToBack)} title="To back" className="grid h-9 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-smooth active:scale-95">
          <ChevronsDown className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={() => {
          pushHistory();
          deleteElements(selectedIds);
        }}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2 text-xs font-medium text-destructive hover:bg-destructive/15 transition-smooth active:scale-95"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}

export function ZoomControls() {
  const { camera, zoomAt, setCamera } = useWB();
  return (
    <div className="pointer-events-auto fixed bottom-5 right-5 z-20">
      <div className="glass-panel flex items-center gap-1 rounded-2xl p-1.5">
        <button
          onClick={() => zoomAt(0.85, window.innerWidth / 2, window.innerHeight / 2)}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-smooth active:scale-95"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
          className="min-w-[60px] rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-smooth active:scale-95"
        >
          {Math.round(camera.zoom * 100)}%
        </button>
        <button
          onClick={() => zoomAt(1.18, window.innerWidth / 2, window.innerHeight / 2)}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-smooth active:scale-95"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
          title="Reset view"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-smooth active:scale-95"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="pointer-events-none fixed left-5 top-5 z-20 hidden md:block">
      <div className="glass-panel flex items-center gap-2 rounded-2xl px-3.5 py-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: "var(--gradient-brand)" }}>
          <Pen className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Inkboard</div>
          <div className="text-[10px] text-muted-foreground">Infinite whiteboard</div>
        </div>
      </div>
    </div>
  );
}
