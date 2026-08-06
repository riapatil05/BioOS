/**
 * API client for the BioOS frontend.
 *
 * This module contains all communication between the React frontend
 * and the FastAPI backend.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// Generic request helper
// ---------------------------------------------------------------------------

async function request(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch (error) {
    throw new Error(
      "Could not connect to the BioOS backend. Make sure the FastAPI server is running."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      `BioOS API request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return data;
}


// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Check whether the BioOS backend is running.
 */
export async function checkBackendHealth() {
  return request("/");
}


// ---------------------------------------------------------------------------
// Biomedical entity extraction
// ---------------------------------------------------------------------------

/**
 * Send scientific text to the backend for structured biomedical
 * entity and relationship extraction.
 *
 * Expected response:
 *
 * {
 *   title: "...",
 *   objects: [
 *     {
 *       tempId: "o1",
 *       type: "Gene",
 *       name: "SPP1",
 *       summary: "..."
 *     }
 *   ],
 *   relationships: [
 *     {
 *       from: "o1",
 *       to: "o2",
 *       type: "ASSOCIATED_WITH"
 *     }
 *   ]
 * }
 */
export async function extractResearchObjects(text) {
  if (!text || !text.trim()) {
    throw new Error("Scientific text cannot be empty.");
  }

  return request("/api/extract", {
    method: "POST",

    body: JSON.stringify({
      text: text.trim(),
    }),
  });
}


// ---------------------------------------------------------------------------
// Graph-grounded question answering
// ---------------------------------------------------------------------------

/**
 * Ask a question using the current BioOS research graph.
 *
 * The backend performs graph retrieval and then sends the retrieved
 * context to the local language model.
 */
export async function askResearchGraph({
  question,
  nodes,
  edges,
  selectedNodeId = null,
}) {
  if (!question || !question.trim()) {
    throw new Error("Question cannot be empty.");
  }

  if (!Array.isArray(nodes)) {
    throw new Error("Graph nodes must be an array.");
  }

  if (!Array.isArray(edges)) {
    throw new Error("Graph edges must be an array.");
  }

  return request("/api/ask", {
    method: "POST",

    body: JSON.stringify({
      question: question.trim(),
      nodes: serializeNodes(nodes),
      edges: serializeEdges(edges),
      selected_node_id: selectedNodeId,
    }),
  });
}


// ---------------------------------------------------------------------------
// Graph serialization
// ---------------------------------------------------------------------------

/**
 * Remove D3-specific properties before sending graph nodes to FastAPI.
 *
 * D3 may attach properties such as vx, vy, index, and simulation state
 * to nodes. The backend only needs the actual research graph data.
 */
function serializeNodes(nodes) {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    name: node.name,
    summary: node.summary || "",
  }));
}


/**
 * Convert graph edges into the representation expected by FastAPI.
 *
 * D3's forceLink may replace source and target IDs with complete node
 * objects. This converts them back into IDs before transmission.
 */
function serializeEdges(edges) {
  return edges.map((edge) => ({
    id: edge.id || null,

    source:
      typeof edge.source === "object"
        ? edge.source.id
        : edge.source,

    target:
      typeof edge.target === "object"
        ? edge.target.id
        : edge.target,

    type: edge.type,
  }));
}