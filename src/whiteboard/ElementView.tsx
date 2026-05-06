import { memo } from "react";
import type { WBElement } from "./types";
import { freehandPath } from "./utils";

interface Props {
  el: WBElement;
  selected?: boolean;
  onTextChange?: (id: string, text: string) => void;
  editing?: boolean;
  onStartEdit?: (id: string) => void;
}

function ElementShape({ el }: { el: WBElement }) {
  const cx = el.w / 2, cy = el.h / 2;
  const transform = `translate(${el.x} ${el.y}) rotate(${(el.rotation * 180) / Math.PI} ${cx} ${cy})`;
  const stroke = el.stroke;
  const fill = el.fill === "transparent" ? "none" : el.fill;
  const sw = el.strokeWidth;

  if (el.type === "freehand") {
    const d = freehandPath(el.points, sw * 2);
    return (
      <g transform={transform} opacity={el.opacity}>
        <path d={d} fill={stroke} />
      </g>
    );
  }
  if (el.type === "rectangle") {
    return (
      <g transform={transform} opacity={el.opacity}>
        <rect x={0} y={0} width={el.w} height={el.h} rx={8} ry={8} stroke={stroke} fill={fill} strokeWidth={sw} strokeLinejoin="round" />
      </g>
    );
  }
  if (el.type === "ellipse") {
    return (
      <g transform={transform} opacity={el.opacity}>
        <ellipse cx={cx} cy={cy} rx={Math.abs(el.w / 2)} ry={Math.abs(el.h / 2)} stroke={stroke} fill={fill} strokeWidth={sw} />
      </g>
    );
  }
  if (el.type === "line" || el.type === "arrow") {
    const arrowId = `arrow-${el.id}`;
    return (
      <g transform={transform} opacity={el.opacity}>
        {el.type === "arrow" && (
          <defs>
            <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
            </marker>
          </defs>
        )}
        <line
          x1={0}
          y1={0}
          x2={el.w}
          y2={el.h}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          markerEnd={el.type === "arrow" ? `url(#${arrowId})` : undefined}
        />
      </g>
    );
  }
  if (el.type === "sticky") {
    return (
      <g transform={transform} opacity={el.opacity}>
        <rect x={0} y={0} width={el.w} height={el.h} fill={el.fill} rx={4} ry={4}
          style={{ filter: "drop-shadow(0 6px 14px rgba(20,20,40,0.18))" }} />
      </g>
    );
  }
  // text rendered via foreignObject below
  return null;
}

function TextLayer({ el, editing, onTextChange, onStartEdit }: Props) {
  if (el.type !== "text" && el.type !== "sticky") return null;
  const cx = el.w / 2, cy = el.h / 2;
  const transform = `translate(${el.x} ${el.y}) rotate(${(el.rotation * 180) / Math.PI} ${cx} ${cy})`;
  const isSticky = el.type === "sticky";
  return (
    <g transform={transform} opacity={el.opacity}>
      <foreignObject x={0} y={0} width={el.w} height={el.h} style={{ overflow: "visible" }}>
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit?.(el.id);
          }}
          style={{
            width: el.w,
            height: el.h,
            padding: isSticky ? 14 : 4,
            fontFamily: isSticky ? "'Caveat', cursive" : "'Inter', sans-serif",
            fontSize: el.fontSize,
            color: el.stroke,
            lineHeight: 1.25,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            display: "flex",
            alignItems: isSticky ? "center" : "flex-start",
            justifyContent: isSticky ? "center" : "flex-start",
            textAlign: isSticky ? "center" : "left",
            userSelect: editing ? "text" : "none",
            cursor: editing ? "text" : "inherit",
            outline: "none",
          }}
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(e) => onTextChange?.(el.id, (e.target as HTMLDivElement).innerText)}
        >
          {el.text || (editing ? "" : isSticky ? "Note..." : "Text")}
        </div>
      </foreignObject>
    </g>
  );
}

export const ElementView = memo(function ElementView(props: Props) {
  return (
    <>
      <ElementShape el={props.el} />
      <TextLayer {...props} />
    </>
  );
});
