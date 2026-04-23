// Output schema v1.0 — types shared by Full and Slim dumps.
// Keep this file as the single source of truth; `docs/SCHEMA.md` documents the same shape
// in narrative form and tracks version diffs.

export const SCHEMA_VERSION = "1.0";
export const SCHEMA_URL = "https://dcl-figma.dev/schemas/1.0.json";
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
  stats: {
    totalNodes: number;
    svgExported: number;
    svgFailed: number;
    variablesError: boolean;
  };
}

export interface Box { x: number; y: number; w: number; h: number; }

// Paints: we flatten Figma's Paint into a tool-neutral shape.
export type Paint =
  | { type: "SOLID"; color: string; opacity?: number }
  | { type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND"; stops: Array<{ position: number; color: string }>; opacity?: number }
  | { type: "IMAGE"; imageHash: string; scaleMode?: string; opacity?: number };

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
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  blendMode?: string;
  locked?: boolean;
}

export interface FrameLikeNode extends NodeCommon {
  type: "FRAME" | "GROUP" | "SECTION" | "COMPONENT" | "COMPONENT_SET";
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
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
    lineHeight?: string | number;
    letterSpacing?: number;
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
  cornerRadius?: number;
  svg?: string;
  svgExportFailed?: boolean;
}

export interface InstanceNode extends NodeCommon {
  type: "INSTANCE";
  mainComponentId: string | null;
  mainComponentName?: string;
  overrides?: Record<string, unknown>;
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
  letterSpacing?: number;
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
