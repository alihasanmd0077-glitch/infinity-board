export type Tool =
  | "select"
  | "pan"
  | "pen"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "sticky"
  | "eraser";

export type ElementType =
  | "freehand"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "sticky";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // radians
  z: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
}

export interface FreehandElement extends BaseElement {
  type: "freehand";
  points: [number, number, number][]; // x,y,pressure (relative to x,y)
}

export interface ShapeElement extends BaseElement {
  type: "rectangle" | "ellipse" | "line" | "arrow";
}

export interface TextElement extends BaseElement {
  type: "text" | "sticky";
  text: string;
  fontSize: number;
  fontFamily: string;
}

export type WBElement = FreehandElement | ShapeElement | TextElement;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
