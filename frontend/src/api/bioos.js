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
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      }
    );
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
    let message =
      `BioOS API request failed with status ${response.status}.`;

    if (typeof data?.detail === "string") {
      message = data.detail;
    } else if (data?.detail) {
      message = JSON.stringify(
        data.detail,
        null,
        2
      );
    }

    throw new Error(message);
  }

  return data;
}


// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function checkBackendHealth() {
  return request("/");
}


// ---------------------------------------------------------------------------
// Biomedical entity extraction
// ---------------------------------------------------------------------------

export async function extractResearchObjects(text) {
  if (!text || !text.trim()) {
    throw new Error(
      "Scientific text cannot be empty."
    );
  }

  return request(
    "/api/extract",
    {
      method: "POST",

      body: JSON.stringify({
        text: text.trim(),
      }),
    }
  );
}


// ---------------------------------------------------------------------------
// Graph-grounded question answering
// ---------------------------------------------------------------------------

/**
 * Ask a question using the current BioOS scientific graph
 * and, when supplied, the current research project.
 *
 * The backend performs:
 *
 *   scientific graph retrieval
 *              +
 *       project context
 *              ↓
 *          reasoning
 */
export async function askResearchGraph({
  question,
  nodes,
  edges,
  selectedNodeId = null,
  projectId = null,
}) {
  if (!question || !question.trim()) {
    throw new Error(
      "Question cannot be empty."
    );
  }

  if (!Array.isArray(nodes)) {
    throw new Error(
      "Graph nodes must be an array."
    );
  }

  if (!Array.isArray(edges)) {
    throw new Error(
      "Graph edges must be an array."
    );
  }

  return request(
    "/api/ask",
    {
      method: "POST",

      body: JSON.stringify({
        question: question.trim(),

        nodes: serializeNodes(
          nodes
        ),

        edges: serializeEdges(
          edges
        ),

        selected_node_id:
          selectedNodeId,

        project_id:
          projectId,
      }),
    }
  );
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


// ---------------------------------------------------------------------------
// Project API
// ---------------------------------------------------------------------------

export async function getProjects() {
  return request(
    "/api/projects"
  );
}


export async function createProject({
  name,
  description = "",
}) {
  if (!name || !name.trim()) {
    throw new Error(
      "Project name cannot be empty."
    );
  }

  return request(
    "/api/projects",
    {
      method: "POST",

      body: JSON.stringify({
        name: name.trim(),
        description:
          description.trim(),
      }),
    }
  );
}


export async function getProject(
  projectId
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  return request(
    `/api/projects/${projectId}`
  );
}


export async function getProjectObjects(
  projectId
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  return request(
    `/api/projects/${projectId}/objects`
  );
}


export async function getProjectRelationships(
  projectId
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  return request(
    `/api/projects/${projectId}/relationships`
  );
}


// ---------------------------------------------------------------------------
// Research Object API
// ---------------------------------------------------------------------------

export async function createProjectObject({
  projectId,
  type,
  name,
  summary = "",
  content = "",
  externalUrl = "",
}) {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  if (!type) {
    throw new Error(
      "Research object type is required."
    );
  }

  if (!name || !name.trim()) {
    throw new Error(
      "Research object name cannot be empty."
    );
  }

  return request(
    `/api/projects/${projectId}/objects`,
    {
      method: "POST",

      body: JSON.stringify({
        type,

        name:
          name.trim(),

        summary:
          summary.trim(),

        content:
          content.trim(),

        external_url:
          externalUrl.trim(),
      }),
    }
  );
}


// ---------------------------------------------------------------------------
// Research Object Relationship API
// ---------------------------------------------------------------------------

export async function createProjectRelationship({
  projectId,
  sourceId,
  targetId,
  type,
}) {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  if (!sourceId) {
    throw new Error(
      "Source object is required."
    );
  }

  if (!targetId) {
    throw new Error(
      "Target object is required."
    );
  }

  if (!type || !type.trim()) {
    throw new Error(
      "Relationship type is required."
    );
  }

  if (sourceId === targetId) {
    throw new Error(
      "Source and target objects must be different."
    );
  }

  return request(
    `/api/projects/${projectId}/relationships`,
    {
      method: "POST",

      body: JSON.stringify({
        source_id:
          sourceId,

        target_id:
          targetId,

        type:
          type.trim().toUpperCase(),
      }),
    }
  );
}
// ---------------------------------------------------------------------------
// Persistent project extraction
// ---------------------------------------------------------------------------

/**
 * Persist a reviewed BioOS extraction into a project.
 *
 * The extraction itself is performed by /api/extract.
 * This endpoint is only responsible for adding the reviewed
 * extraction to the persistent project workspace.
 */
export async function importExtractionToProject(projectId, extraction, sourceText) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  if (!extraction || !Array.isArray(extraction.objects)) {
    throw new Error("Invalid extraction result.");
  }

  return request(`/api/projects/${projectId}/import-extraction`, {
    method: "POST",
    body: JSON.stringify({
      source_text: sourceText || "",
      title: extraction.title || "Imported Scientific Text",
      objects: extraction.objects,
      relationships: extraction.relationships || [],
    }),
  });
}