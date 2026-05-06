import { Canvas } from "@/whiteboard/Canvas";
import { BrandMark, StylePanel, Toolbar, ZoomControls } from "@/whiteboard/Toolbar";

const Index = () => {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <h1 className="sr-only">Inkboard — Infinite Collaborative Whiteboard</h1>
      <Canvas />
      <BrandMark />
      <Toolbar />
      <StylePanel />
      <ZoomControls />
      <Hint />
    </main>
  );
};

function Hint() {
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-20 -translate-x-1/2 hidden md:block">
      <div className="glass-panel rounded-full px-5 py-2 text-xs tracking-wide text-muted-foreground/80 whitespace-nowrap shadow-[0_4px_20px_-4px_hsl(var(--primary)_/_0.15)]">
        Scroll to pan · ⌘/Ctrl + scroll to zoom · Press <kbd className="mx-1 rounded-md border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">V</kbd>
        select · <kbd className="mx-1 rounded-md border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">P</kbd> pen ·
        <kbd className="mx-1 rounded-md border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">S</kbd> sticky ·
        Double-click text to edit
      </div>
    </div>
  );
}

export default Index;
