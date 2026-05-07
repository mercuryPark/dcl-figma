// Output schema v2.0 — types shared by Full and Slim dumps.
// Keep this file as the single source of truth; `docs/SCHEMA.md` documents the same shape
// in narrative form and tracks version diffs.

export const SCHEMA_VERSION = "2.0";
export const SCHEMA_URL = "https://dcl-figma.dev/schemas/2.0.json";
export const HOW_TO_USE =
  "Figma design dump for LLM context. Load this JSON and reference screens[], tokens, and components when generating UI code.";
export const TOOL_ID = "dcl-figma";

export interface Meta {
  fileKey: string | null;
  fileName: string;
  pageId: string;
  pageName: string;
  tool: string;
  generatedAt: string;
  degraded: string[];
  warnings?: {
    svgFailed: number;
    svgCapped: number;
    styleError: string | null;
    variablesError: boolean;
  };
  stats: {
    totalNodes: number;
    svgExported: number;
    svgFailed: number;
    variablesError: boolean;
  };
}

export interface Box { x: number; y: number; w: number; h: number; }

export type StrokeAlign = "INSIDE" | "OUTSIDE" | "CENTER";
export type StrokeCap = "NONE" | "ROUND" | "SQUARE" | "ARROW_LINES" | "ARROW_EQUILATERAL";
export type StrokeJoin = "MITER" | "BEVEL" | "ROUND";
export interface IndividualStrokes { top: number; right: number; bottom: number; left: number; }

// Paints: we flatten Figma's Paint into a tool-neutral shape.
export type Paint =
  | { type: "SOLID"; color: string; opacity?: number }
  | { type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND"; stops: Array<{ position: number; color: string }>; opacity?: number; gradientTransform?: number[][] }
  | { type: "IMAGE"; imageHash: string; scaleMode?: string; opacity?: number; rotation?: number; scalingFactor?: number; cropRect?: { x: number; y: number; w: number; h: number } };

export interface Effect {
  type: string; // DROP_SHADOW / INNER_SHADOW / LAYER_BLUR / BACKGROUND_BLUR
  color?: string;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
}

// --- Node shapes ------------------------------------------------------------
// BaseNode only carries fields that survive pruning.
interface NodeCommon {
  id: string;
  type: string;
  name: string;
  box?: Box;
  renderBox?: Box;
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  relativeTransform?: number[][];
  blendMode?: string;
  locked?: boolean;
  // Parent-relative resize behavior. Only emitted when non-default (non MIN/MIN).
  constraints?: { horizontal: string; vertical: string };
  // Auto-layout positioning. Only emitted when "ABSOLUTE" (i.e., child opts out of auto-layout).
  layoutPositioning?: string;
}

// Per-corner radii. Only emitted when corners differ from each other.
export interface CornerRadii { tl: number; tr: number; br: number; bl: number; }

export interface FrameLikeNode extends NodeCommon {
  type: "FRAME" | "GROUP" | "SECTION" | "COMPONENT" | "COMPONENT_SET";
  layoutMode?: string;
  layoutWrap?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  // Cross-axis spacing used when layoutWrap === "WRAP". Distinct from itemSpacing.
  counterAxisSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  fills?: Paint[];
  strokes?: Paint[];
  strokeAlign?: StrokeAlign;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeDashes?: number[];
  strokeMiterLimit?: number;
  individualStrokes?: IndividualStrokes;
  effects?: Effect[];
  cornerRadius?: number;
  cornerRadii?: CornerRadii;
  clipsContent?: boolean;
  children?: AnyNode[];
}

export interface TextNode extends NodeCommon {
  type: "TEXT";
  characters: string;
  style: {
    fontFamily?: string;
    fontStyle?: string;
    fontSize?: number;
    // Stringified with unit suffix when known: e.g., "120%", "1.2px", or "AUTO".
    lineHeight?: string | number;
    // Stringified with unit suffix when known ("4%" or "0.5px"); raw number is fallback only.
    letterSpacing?: string | number;
    // Per-character-range style overrides. When present, run fields take precedence;
    // top-level fields remain a fallback for uniform properties.
    runs?: Array<{
      start: number;
      end: number;
      fontFamily?: string;
      fontStyle?: string;
      fontSize?: number;
      lineHeight?: string | number;
      letterSpacing?: string | number;
      fills?: Paint[];
      textCase?: string;
      textDecoration?: string;
    }>;
    textCase?: string;
    textDecoration?: string;
  };
  fills?: Paint[];
}

export interface VectorNode extends NodeCommon {
  type: "VECTOR";
  origType: "LINE" | "RECTANGLE" | "ELLIPSE" | "POLYGON" | "STAR" | "BOOLEAN_OPERATION" | "VECTOR";
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: StrokeAlign;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeDashes?: number[];
  strokeMiterLimit?: number;
  cornerRadius?: number;
  cornerRadii?: CornerRadii;
  svg?: string;
  svgExportFailed?: boolean;
}

// One override entry = which fields differ from the main component for a given child node id.
// The child node with this id appears in the instance's `children` tree, so the *current* values
// of those fields are recoverable by looking up that node. Top-level instance overrides (fills,
// box, etc.) live on the InstanceNode itself.
export interface InstanceOverride {
  fields: string[];
  nodeType?: string;
}

export interface InstanceNode extends NodeCommon {
  type: "INSTANCE";
  mainComponentId: string | null;
  mainComponentName?: string;
  overrides?: Record<string, InstanceOverride>;
  fills?: Paint[];
  children?: AnyNode[];
}

export type AnyNode = FrameLikeNode | TextNode | VectorNode | InstanceNode;

// --- Token shapes ----------------------------------------------------------

export interface ColorToken { id: string; name: string; value: Paint[] }
export interface TypographyToken {
  id: string;
  name: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: string | number;
  letterSpacing?: string | number;
}
export interface EffectToken { id: string; name: string; effects: Effect[] }

export interface VariableEntry {
  id: string;
  name: string;
  collectionName: string;
  resolvedType: string;
  value: unknown;
  modeId: string;
  modeName: string;
  scope?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

export interface Tokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  effects: EffectToken[];
  variables: VariableEntry[];
}

// --- Dump envelopes --------------------------------------------------------

export interface Page {
  id: string;
  name: string;
  children: AnyNode[];
}

export interface ComponentEntry {
  id: string;
  name: string;
  description?: string;
  box?: Box;
}

export interface DesignFull {
  $schema: string;
  schemaVersion: string;
  _howToUse: string;
  meta: Meta;
  tokens: Tokens;
  pages: Page[];
  components: ComponentEntry[];
}

export interface ScreenSummary {
  id: string;
  name: string;
  box?: Box;
  textSummary: string[];
  sectionTree: string; // indent-based text tree, depth ≤ 3 by default
}

export interface DesignSlim {
  $schema: string;
  schemaVersion: string;
  _howToUse: string;
  meta: Meta;
  tokens?: Tokens;
  screens: ScreenSummary[];
  components: ComponentEntry[];
}
