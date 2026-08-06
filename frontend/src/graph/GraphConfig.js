/**
 * Graph configuration for BioOS.
 *
 * Defines the supported research object types and relationship types,
 * together with the visual metadata used by the D3 graph.
 */

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export const TYPE_META = {
  Paper: {
    color: "#FB7185",
    shape: "circle",
    label: "Paper",
  },

  Gene: {
    color: "#45D9C4",
    shape: "hexagon",
    label: "Gene",
  },

  Drug: {
    color: "#F5A623",
    shape: "diamond",
    label: "Drug",
  },

  Pathway: {
    color: "#5FA8FA",
    shape: "square",
    label: "Pathway",
  },

  Finding: {
    color: "#B292F7",
    shape: "star",
    label: "Finding",
  },

  Hypothesis: {
    color: "#F472B6",
    shape: "triangle",
    label: "Hypothesis",
  },

  Disease: {
  color: "#F87171",
  shape: "circle",
  label: "Disease",
  },
};


// ---------------------------------------------------------------------------
// Relationship types
// ---------------------------------------------------------------------------

export const EDGE_META = {
  MENTIONS: {
    color: "#33415B",
    dash: "2,3",
    width: 1,
  },

  SUPPORTS: {
    color: "#34D399",
    dash: null,
    width: 2,
  },

  CONTRADICTS: {
    color: "#F87171",
    dash: "5,3",
    width: 2,
  },

  ASSOCIATED_WITH: {
    color: "#5B6B8C",
    dash: "1,3",
    width: 1,
  },

  MEASURES: {
    color: "#45D9C4",
    dash: null,
    width: 1.5,
  },

  TARGETS: {
    color: "#F5A623",
    dash: null,
    width: 1.5,
  },

  PART_OF: {
    color: "#5FA8FA",
    dash: null,
    width: 1.5,
  },

  RELATES_TO: {
    color: "#B292F7",
    dash: "2,2",
    width: 1.5,
  },

  DERIVED_FROM: {
    color: "#FB7185",
    dash: null,
    width: 1.5,
  },
};


// ---------------------------------------------------------------------------
// Fallback relationship style
// ---------------------------------------------------------------------------

export const DEFAULT_EDGE = {
  color: "#334155",
  dash: null,
  width: 1,
};


// ---------------------------------------------------------------------------
// Graph dimensions
// ---------------------------------------------------------------------------

export const GRAPH_WIDTH = 900;
export const GRAPH_HEIGHT = 560;