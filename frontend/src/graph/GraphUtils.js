/**
 * Utility functions for manipulating the BioOS research graph.
 *
 * These functions handle node lookup, deduplication, edge creation,
 * graph connectivity, and graph statistics. They are independent of
 * React and D3 rendering.
 */


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * D3 may replace an edge's source/target ID with the complete node object.
 *
 * This helper ensures that the rest of the application can always obtain
 * the node ID regardless of which representation D3 is currently using.
 */
export function getEndpointId(endpoint) {
  if (typeof endpoint === "object" && endpoint !== null) {
    return endpoint.id;
  }

  return endpoint;
}


// ---------------------------------------------------------------------------
// Node lookup
// ---------------------------------------------------------------------------

/**
 * Find an existing node using its type and canonicalized name.
 *
 * Matching is case-insensitive and ignores leading/trailing whitespace.
 */
export function findNode(nodes, type, name) {
  if (!name) {
    return null;
  }

  const normalizedName = name.trim().toLowerCase();

  return (
    nodes.find(
      (node) =>
        node.type === type &&
        node.name.trim().toLowerCase() === normalizedName
    ) || null
  );
}


// ---------------------------------------------------------------------------
// Node creation
// ---------------------------------------------------------------------------

/**
 * Add a node to the graph unless an equivalent node already exists.
 *
 * This provides simple canonical-name entity deduplication. For example,
 * two papers mentioning "SPP1" will connect to the same Gene node rather
 * than creating duplicate SPP1 nodes.
 *
 * Returns the existing or newly created node.
 */
export function addNode({
  nodes,
  type,
  name,
  summary = "",
  id,
  centerX = 450,
  centerY = 280,
}) {
  const existing = findNode(nodes, type, name);

  if (existing) {
    // Preserve an existing summary, but populate it if it was previously empty.
    if (summary && !existing.summary) {
      existing.summary = summary;
    }

    return existing;
  }

  // Position new nodes close to the first Paper node when possible.
  // D3 will subsequently calculate the final graph layout.
  const anchor =
    nodes.find((node) => node.type === "Paper") || {
      x: centerX,
      y: centerY,
    };

  const node = {
    id,
    type,
    name: name.trim(),
    summary,
    x: (anchor.x ?? centerX) + (Math.random() - 0.5) * 120,
    y: (anchor.y ?? centerY) + (Math.random() - 0.5) * 120,
  };

  nodes.push(node);

  return node;
}


// ---------------------------------------------------------------------------
// Edge lookup
// ---------------------------------------------------------------------------

/**
 * Determine whether a particular typed edge already exists.
 */
export function edgeExists(
  edges,
  sourceId,
  targetId,
  type
) {
  return edges.some((edge) => {
    const source = getEndpointId(edge.source);
    const target = getEndpointId(edge.target);

    return (
      source === sourceId &&
      target === targetId &&
      edge.type === type
    );
  });
}


// ---------------------------------------------------------------------------
// Edge creation
// ---------------------------------------------------------------------------

/**
 * Add a directed edge unless the same relationship already exists.
 *
 * Self-referential edges are ignored.
 *
 * Returns the new edge, or null when no edge was added.
 */
export function addEdge({
  edges,
  sourceId,
  targetId,
  type,
  id,
}) {
  if (!sourceId || !targetId) {
    return null;
  }

  if (sourceId === targetId) {
    return null;
  }

  if (edgeExists(edges, sourceId, targetId, type)) {
    return null;
  }

  const edge = {
    id,
    source: sourceId,
    target: targetId,
    type,
  };

  edges.push(edge);

  return edge;
}


// ---------------------------------------------------------------------------
// Degree
// ---------------------------------------------------------------------------

/**
 * Return the number of edges connected to a node.
 */
export function getNodeDegree(edges, nodeId) {
  return edges.filter((edge) => {
    const source = getEndpointId(edge.source);
    const target = getEndpointId(edge.target);

    return source === nodeId || target === nodeId;
  }).length;
}


// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

/**
 * Return all graph connections for a selected node.
 *
 * Each returned object contains:
 *
 * {
 *   other: connected node,
 *   type: relationship type,
 *   direction: "outgoing" | "incoming"
 * }
 */
export function getConnections(
  nodes,
  edges,
  nodeId
) {
  if (!nodeId) {
    return [];
  }

  const nodeLookup = new Map(
    nodes.map((node) => [node.id, node])
  );

  const connections = [];

  edges.forEach((edge) => {
    const sourceId = getEndpointId(edge.source);
    const targetId = getEndpointId(edge.target);

    if (sourceId === nodeId) {
      const other = nodeLookup.get(targetId);

      if (other) {
        connections.push({
          other,
          type: edge.type,
          direction: "outgoing",
        });
      }
    }

    if (targetId === nodeId) {
      const other = nodeLookup.get(sourceId);

      if (other) {
        connections.push({
          other,
          type: edge.type,
          direction: "incoming",
        });
      }
    }
  });

  return connections;
}


// ---------------------------------------------------------------------------
// Object counts
// ---------------------------------------------------------------------------

/**
 * Count graph nodes by research object type.
 */
export function countNodesByType(nodes, nodeTypes) {
  const counts = {};

  nodeTypes.forEach((type) => {
    counts[type] = 0;
  });

  nodes.forEach((node) => {
    if (Object.prototype.hasOwnProperty.call(counts, node.type)) {
      counts[node.type] += 1;
    }
  });

  return counts;
}


// ---------------------------------------------------------------------------
// Import extracted research objects
// ---------------------------------------------------------------------------

/**
 * Convert an extraction result returned by the backend into graph nodes
 * and edges.
 *
 * The backend returns temporary IDs such as "o1" and "o2". This function
 * maps those temporary IDs onto the permanent frontend graph node IDs.
 */
export function addExtractionToGraph({
  extraction,
  sourceText,
  nodes,
  edges,
  createId,
  centerX = 450,
  centerY = 280,
}) {
  // Create a Paper node representing the imported text.
  const paperNode = addNode({
    nodes,
    type: "Paper",
    name: extraction.title || "Untitled excerpt",
    summary: sourceText.trim().slice(0, 220),
    id: createId("n"),
    centerX,
    centerY,
  });

  const tempIdMap = {};

  // Add extracted biomedical objects.
  for (const object of extraction.objects || []) {
    const existing = findNode(
      nodes,
      object.type,
      object.name
    );

    const node = addNode({
      nodes,
      type: object.type,
      name: object.name,
      summary: object.summary,
      id: existing ? existing.id : createId("n"),
      centerX,
      centerY,
    });

    tempIdMap[object.tempId] = node.id;

    // Every extracted object is mentioned by the imported paper.
    addEdge({
      edges,
      sourceId: paperNode.id,
      targetId: node.id,
      type: "MENTIONS",
      id: createId("e"),
    });
  }

  // Add relationships discovered by the extraction model.
  for (const relationship of extraction.relationships || []) {
    const sourceId = tempIdMap[relationship.from];
    const targetId = tempIdMap[relationship.to];

    if (!sourceId || !targetId) {
      continue;
    }

    addEdge({
      edges,
      sourceId,
      targetId,
      type: relationship.type || "ASSOCIATED_WITH",
      id: createId("e"),
    });
  }

  return paperNode;
}