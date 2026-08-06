/**
 * Detail panel for a selected BioOS research object.
 */

import { TYPE_META } from "../graph/graphConfig";
import { getConnections } from "../graph/graphUtils";
import React from "react";

export default function NodeDetails({
  node,
  nodes,
  edges,
  onSelectNode,
}) {
  if (!node) {
    return (
      <aside className="node-details empty-state">
        <div className="panel-label">
          OBJECT DETAILS
        </div>

        <p>
          Select an object in the research graph to inspect
          its summary and relationships.
        </p>
      </aside>
    );
  }

  const meta = TYPE_META[node.type];

  const connections = getConnections(
    nodes,
    edges,
    node.id
  );

  return (
    <aside className="node-details">
      <div className="node-type">
        <span
          className="node-type-dot"
          style={{
            backgroundColor: meta?.color || "#64748B",
          }}
        />

        {node.type.toUpperCase()}
      </div>

      <h2 className="node-title">
        {node.name}
      </h2>

      {node.summary && (
        <p className="node-summary">
          {node.summary}
        </p>
      )}

      <div className="connections-heading">
        CONNECTIONS · {connections.length}
      </div>

      {connections.length === 0 ? (
        <p className="empty-connections">
          No relationships yet.
        </p>
      ) : (
        <div className="connections-list">
          {connections.map(
            (connection, index) => (
              <button
                type="button"
                className="connection-item"
                key={`${connection.other.id}-${connection.type}-${index}`}
                onClick={() =>
                  onSelectNode(connection.other.id)
                }
              >
                <span className="connection-direction">
                  {connection.direction === "outgoing"
                    ? "→"
                    : "←"}
                </span>

                <span className="connection-type">
                  {formatRelationship(
                    connection.type
                  )}
                </span>

                <span className="connection-name">
                  {connection.other.name}
                </span>
              </button>
            )
          )}
        </div>
      )}
    </aside>
  );
}


/**
 * Convert relationship identifiers such as ASSOCIATED_WITH
 * into readable labels.
 */
function formatRelationship(type) {
  return type
    .toLowerCase()
    .replaceAll("_", " ");
}