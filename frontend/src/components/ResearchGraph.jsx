/**
 * Interactive D3 research graph for BioOS.
 */

import React, {
  useEffect,
  useRef,
} from "react";

import * as d3 from "d3";

import {
  DEFAULT_EDGE,
  EDGE_META,
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  TYPE_META,
} from "../graph/graphConfig";

import {
  getEndpointId,
  getNodeDegree,
} from "../graph/graphUtils";


export default function ResearchGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);


  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const svg = d3.select(svgRef.current);

    svg.selectAll("*").remove();

    drawGraph({
      svg,
      nodes,
      edges,
      selectedNodeId,
      onSelectNode,
      simulationRef,
    });

    return () => {
      simulationRef.current?.stop();
    };
  }, [
    nodes,
    edges,
    selectedNodeId,
    onSelectNode,
  ]);


  return (
    <div className="research-graph-container">
      {nodes.length === 0 && (
        <div className="graph-empty-state">
          <div className="graph-empty-title">
            Your research graph is empty
          </div>

          <p>
            Import a scientific abstract or excerpt
            to create your first research objects.
          </p>
        </div>
      )}

      <svg
        ref={svgRef}
        className="research-graph"
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        role="img"
        aria-label="BioOS research knowledge graph"
      />
    </div>
  );
}


// ---------------------------------------------------------------------------
// Graph drawing
// ---------------------------------------------------------------------------

function drawGraph({
  svg,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  simulationRef,
}) {
  if (nodes.length === 0) {
    return;
  }

  /*
   * D3 mutates nodes and edges during force simulation.
   *
   * We create shallow copies so D3 does not directly mutate the
   * application state passed down from React.
   */
  const simulationNodes = nodes.map(
    (node) => ({ ...node })
  );

  const simulationEdges = edges.map(
    (edge) => ({
      ...edge,
      source: getEndpointId(edge.source),
      target: getEndpointId(edge.target),
    })
  );


  // -------------------------------------------------------------------------
  // Definitions
  // -------------------------------------------------------------------------

  const defs = svg.append("defs");

  defs
    .append("marker")
    .attr("id", "bioos-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#64748B");


  // -------------------------------------------------------------------------
  // Main graph group
  // -------------------------------------------------------------------------

  const graphGroup = svg
    .append("g")
    .attr("class", "graph-layer");


  // -------------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------------

  const zoom = d3
    .zoom()
    .scaleExtent([0.4, 2.5])
    .on("zoom", (event) => {
      graphGroup.attr(
        "transform",
        event.transform
      );
    });

  svg.call(zoom);


  // -------------------------------------------------------------------------
  // Edges
  // -------------------------------------------------------------------------

  const edgeSelection = graphGroup
    .append("g")
    .attr("class", "edges")
    .selectAll("line")
    .data(simulationEdges)
    .join("line")
    .attr("class", "graph-edge")
    .attr("stroke", (edge) => {
      const meta =
        EDGE_META[edge.type] ||
        DEFAULT_EDGE;

      return meta.color;
    })
    .attr("stroke-width", (edge) => {
      const meta =
        EDGE_META[edge.type] ||
        DEFAULT_EDGE;

      return meta.width;
    })
    .attr("stroke-dasharray", (edge) => {
      const meta =
        EDGE_META[edge.type] ||
        DEFAULT_EDGE;

      return meta.dash || null;
    })
    .attr("marker-end", "url(#bioos-arrow)")
    .attr("opacity", (edge) => {
    if (!selectedNodeId) {
      return 0.75;
    }

    const sourceId = getEndpointId(edge.source);
    const targetId = getEndpointId(edge.target);

    const connected =
      sourceId === selectedNodeId ||
      targetId === selectedNodeId;

    return connected ? 1 : 0.12;
  });


  // -------------------------------------------------------------------------
  // Nodes
  // -------------------------------------------------------------------------

  const nodeSelection = graphGroup
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(
      simulationNodes,
      (node) => node.id
    )
    .join("g")
    .attr("class", "graph-node")
    .style("cursor", "pointer")
    .on("click", (event, node) => {
      event.stopPropagation();
      onSelectNode(node.id);
    });

  const connectedNodeIds = new Set();

  if (selectedNodeId) {
    connectedNodeIds.add(selectedNodeId);

    simulationEdges.forEach((edge) => {
      const sourceId = getEndpointId(edge.source);
      const targetId = getEndpointId(edge.target);

      if (sourceId === selectedNodeId) {
        connectedNodeIds.add(targetId);
      }

      if (targetId === selectedNodeId) {
        connectedNodeIds.add(sourceId);
      }
    });
  }

  nodeSelection.attr("opacity", (node) => {
    if (!selectedNodeId) {
      return 1;
    }

    return connectedNodeIds.has(node.id)
      ? 1
      : 0.22;
  });
  nodeSelection.each(function (node) {
    const group = d3.select(this);

    const degree = getNodeDegree(
      simulationEdges,
      node.id
    );

    const radius = getNodeRadius(
      node,
      degree
    );

    drawNodeShape(
      group,
      node,
      radius,
      node.id === selectedNodeId
    );
  });


  // -------------------------------------------------------------------------
  // Labels
  // -------------------------------------------------------------------------
  nodeSelection.each(function (node) {
    const group = d3.select(this);

    const degree = getNodeDegree(
      simulationEdges,
      node.id
    );

    const radius = getNodeRadius(node, degree);

    const label = group
      .append("text")
      .attr("class", "graph-node-label")
      .attr("text-anchor", "middle")
      .attr("y", radius + 16);

    const lines = wrapLabel(node.name, 22);

    lines.forEach((line, index) => {
      label
        .append("tspan")
        .attr("x", 0)
        .attr("dy", index === 0 ? 0 : 13)
        .text(line);
    });
  });

  // -------------------------------------------------------------------------
  // Drag
  // -------------------------------------------------------------------------

  nodeSelection.call(
    d3
      .drag()
      .on("start", (event, node) => {
        if (!event.active) {
          simulationRef.current
            ?.alphaTarget(0.3)
            .restart();
        }

        node.fx = node.x;
        node.fy = node.y;
      })

      .on("drag", (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })

      .on("end", (event, node) => {
        if (!event.active) {
          simulationRef.current
            ?.alphaTarget(0);
        }

        node.fx = null;
        node.fy = null;
      })
  );


  // -------------------------------------------------------------------------
  // Force simulation
  // -------------------------------------------------------------------------

  const simulation = d3
    .forceSimulation(simulationNodes)
    .force(
      "link",
      d3
        .forceLink(simulationEdges)
        .id((node) => node.id)
        .distance(150)
        .strength(0.5)
    )

    .force(
      "charge",
    d3
      .forceManyBody()
      .strength(-650)
    )
    
    .force(
      "center",
      d3.forceCenter(
        GRAPH_WIDTH / 2,
        GRAPH_HEIGHT / 2
      )
    )

    .force(
      "collision",
      d3
        .forceCollide()
        .radius((node) => {
          const degree = getNodeDegree(
            simulationEdges,
            node.id
          );

          return (
            getNodeRadius(node, degree) +
            32
          );
        })
    );


  simulationRef.current = simulation;


  simulation.on("tick", () => {
    edgeSelection
      .attr(
        "x1",
        (edge) => edge.source.x
      )
      .attr(
        "y1",
        (edge) => edge.source.y
      )
      .attr(
        "x2",
        (edge) => edge.target.x
      )
      .attr(
        "y2",
        (edge) => edge.target.y
      );

    nodeSelection.attr(
      "transform",
      (node) =>
        `translate(${node.x},${node.y})`
    );
  });


  // Clicking empty graph space clears selection.
  svg.on("click", () => {
    onSelectNode(null);
  });
}


// ---------------------------------------------------------------------------
// Node sizing
// ---------------------------------------------------------------------------

function getNodeRadius(node, degree) {
  const base =
    node.type === "Paper" ? 21 : 16;

  return Math.min(
    30,
    base + Math.sqrt(degree) * 2
  );
}


// ---------------------------------------------------------------------------
// Node shapes
// ---------------------------------------------------------------------------

function drawNodeShape(
  group,
  node,
  radius,
  selected
) {
  const meta =
    TYPE_META[node.type] ||
    TYPE_META.Finding;

  const stroke = selected
    ? "#FFFFFF"
    : "#0B1220";

  const strokeWidth = selected
    ? 3
    : 1.5;

  if (meta.shape === "circle") {
    group
      .append("circle")
      .attr("r", radius)
      .attr("fill", meta.color)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth);

    return;
  }


  if (meta.shape === "square") {
    group
      .append("rect")
      .attr("x", -radius)
      .attr("y", -radius)
      .attr("width", radius * 2)
      .attr("height", radius * 2)
      .attr("rx", 3)
      .attr("fill", meta.color)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth);

    return;
  }


  if (meta.shape === "diamond") {
    group
      .append("path")
      .attr(
        "d",
        `M 0 ${-radius}
         L ${radius} 0
         L 0 ${radius}
         L ${-radius} 0
         Z`
      )
      .attr("fill", meta.color)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth);

    return;
  }


  if (meta.shape === "triangle") {
    const path = d3
      .symbol()
      .type(d3.symbolTriangle)
      .size(radius * radius * 3.5);

    group
      .append("path")
      .attr("d", path())
      .attr("fill", meta.color)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth);

    return;
  }


  if (meta.shape === "star") {
    const path = d3
      .symbol()
      .type(d3.symbolStar)
      .size(radius * radius * 3.5);

    group
      .append("path")
      .attr("d", path())
      .attr("fill", meta.color)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth);

    return;
  }


  if (meta.shape === "hexagon") {
    const points = [];

    for (let i = 0; i < 6; i += 1) {
      const angle =
        (Math.PI / 3) * i -
        Math.PI / 2;

      points.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
      ]);
    }

    group
      .append("polygon")
      .attr(
        "points",
        points
          .map(
            ([x, y]) => `${x},${y}`
          )
          .join(" ")
      )
      .attr("fill", meta.color)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth);

    return;
  }


  // Fallback shape
  group
    .append("circle")
    .attr("r", radius)
    .attr("fill", meta.color)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth);
}


// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function wrapLabel(label, maxLength = 22) {
  if (!label) {
    return [];
  }

  if (label.length <= maxLength) {
    return [label];
  }

  const words = label.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (candidate.length <= maxLength) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= 2) {
    return lines;
  }

  const secondLine = lines
    .slice(1)
    .join(" ");

  return [
    lines[0],
    secondLine.length > maxLength
      ? `${secondLine.slice(0, maxLength - 1)}…`
      : secondLine,
  ];
}
