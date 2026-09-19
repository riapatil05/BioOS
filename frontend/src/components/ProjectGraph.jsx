import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";


const TYPE_META = {
  dataset: {
    label: "DATASET",
    color: "#7484f5",
  },

  paper: {
    label: "PAPER",
    color: "#8b9cff",
  },

  code: {
    label: "CODE",
    color: "#67c5d8",
  },

  analysis: {
    label: "ANALYSIS",
    color: "#a78bfa",
  },

  finding: {
    label: "FINDING",
    color: "#f59e9e",
  },

  hypothesis: {
    label: "HYPOTHESIS",
    color: "#f5c97a",
  },

  figure: {
    label: "FIGURE",
    color: "#6fd1a8",
  },

  note: {
    label: "NOTE",
    color: "#9da9bc",
  },
};


export default function ProjectGraph({
  objects = [],
  relationships = [],
  onSelectObject,
}) {
  const svgRef = useRef(null);


  /*
   * Build a lookup table so relationships can be
   * converted from object IDs into graph nodes.
   */
  const objectMap = useMemo(() => {
    return new Map(
      objects.map((object) => [
        object.id,
        object,
      ])
    );
  }, [objects]);


  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return;
    }


    const svg = d3.select(svgElement);

    svg.selectAll("*").remove();


    /*
     * If there are no research objects, show an
     * empty state instead of creating a simulation.
     */
    if (objects.length === 0) {
      svg
        .attr("viewBox", "0 0 800 450")
        .attr("preserveAspectRatio", "xMidYMid meet");

      svg
        .append("text")
        .attr("x", 400)
        .attr("y", 215)
        .attr("text-anchor", "middle")
        .attr("fill", "#596579")
        .attr("font-size", 14)
        .text("No research objects yet.");

      svg
        .append("text")
        .attr("x", 400)
        .attr("y", 240)
        .attr("text-anchor", "middle")
        .attr("fill", "#4e596c")
        .attr("font-size", 11)
        .text("Add datasets, analyses, papers, or findings to build the graph.");

      return;
    }


    /*
     * Read the actual rendered size of the graph panel.
     */
    const width =
      svgElement.clientWidth || 900;

    const height =
      svgElement.clientHeight || 520;


    svg
      .attr(
        "viewBox",
        `0 0 ${width} ${height}`
      )
      .attr(
        "preserveAspectRatio",
        "xMidYMid meet"
      );


    /*
     * Create independent graph data so D3 can mutate
     * positions without changing React state.
     */
    const nodes = objects.map((object) => ({
      ...object,
    }));


    /*
     * Only create edges when both referenced objects
     * actually exist in this project.
     */
    const links = relationships
      .filter(
        (relationship) =>
          objectMap.has(
            relationship.source_id
          ) &&
          objectMap.has(
            relationship.target_id
          )
      )
      .map((relationship) => ({
        ...relationship,
        source:
          relationship.source_id,
        target:
          relationship.target_id,
      }));


    /*
     * Main graph container.
     */
    const graph = svg.append("g");


    /*
     * Zoom and pan.
     */
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 2.5])
      .on("zoom", (event) => {
        graph.attr(
          "transform",
          event.transform
        );
      });

    svg.call(zoom);


    /*
     * Arrow marker used by relationship edges.
     */
    svg
      .append("defs")
      .append("marker")
      .attr("id", "project-graph-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#566176");


    /*
     * Relationship edges.
     */
    const link = graph
      .append("g")
      .attr(
        "class",
        "project-graph-links"
      )
      .selectAll("line")
      .data(links)
      .join("line")
      .attr(
        "class",
        "project-graph-link"
      )
      .attr(
        "stroke",
        "#303a50"
      )
      .attr(
        "stroke-width",
        1.2
      )
      .attr(
        "marker-end",
        "url(#project-graph-arrow)"
      );


    /*
     * Relationship labels.
     */
    const linkLabel = graph
      .append("g")
      .attr(
        "class",
        "project-graph-link-labels"
      )
      .selectAll("text")
      .data(links)
      .join("text")
      .attr(
        "class",
        "project-graph-link-label"
      )
      .attr(
        "text-anchor",
        "middle"
      )
      .text(
        (relationship) =>
          relationship.type
      );


    /*
     * Node groups.
     */
    const node = graph
      .append("g")
      .attr(
        "class",
        "project-graph-nodes"
      )
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr(
        "class",
        "project-graph-node"
      )
      .style(
        "cursor",
        "pointer"
      );


    /*
     * Node circles.
     */
    node
      .append("circle")
      .attr(
        "r",
        25
      )
      .attr(
        "fill",
        "#0b111d"
      )
      .attr(
        "stroke",
        (object) =>
          TYPE_META[
            object.type
          ]?.color || "#596579"
      )
      .attr(
        "stroke-width",
        2
      );


    /*
     * Small type indicator inside the node.
     */
    node
      .append("circle")
      .attr(
        "r",
        6
      )
      .attr(
        "fill",
        (object) =>
          TYPE_META[
            object.type
          ]?.color || "#596579"
      );


    /*
     * Object name.
     */
    node
      .append("text")
      .attr(
        "class",
        "project-graph-node-name"
      )
      .attr(
        "text-anchor",
        "middle"
      )
      .attr(
        "dy",
        43
      )
      .text(
        (object) =>
          object.name
      );


    /*
     * Object type.
     */
    node
      .append("text")
      .attr(
        "class",
        "project-graph-node-type"
      )
      .attr(
        "text-anchor",
        "middle"
      )
      .attr(
        "dy",
        57
      )
      .text(
        (object) =>
          TYPE_META[
            object.type
          ]?.label ||
          object.type.toUpperCase()
      );


    /*
     * Clicking a graph node sends the corresponding
     * research object back to the dashboard.
     */
    node.on(
      "click",
      (event, object) => {
        event.stopPropagation();

        if (onSelectObject) {
          onSelectObject(object);
        }
      }
    );


    /*
     * Dragging nodes.
     */
    node.call(
      d3
        .drag()
        .on(
          "start",
          (event, object) => {
            if (!event.active) {
              simulation.alphaTarget(
                0.3
              ).restart();
            }

            object.fx =
              object.x;

            object.fy =
              object.y;
          }
        )
        .on(
          "drag",
          (event, object) => {
            object.fx =
              event.x;

            object.fy =
              event.y;
          }
        )
        .on(
          "end",
          (event, object) => {
            if (!event.active) {
              simulation.alphaTarget(
                0
              );
            }

            object.fx = null;
            object.fy = null;
          }
        )
    );


    /*
     * D3 force simulation.
     */
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id(
            (object) =>
              object.id
          )
          .distance(170)
      )
      .force(
        "charge",
        d3
          .forceManyBody()
          .strength(-500)
      )
      .force(
        "center",
        d3.forceCenter(
          width / 2,
          height / 2
        )
      )
      .force(
        "collision",
        d3.forceCollide(65)
      );


    /*
     * Update positions every simulation tick.
     */
    simulation.on(
      "tick",
      () => {
        link
          .attr(
            "x1",
            (relationship) =>
              relationship.source.x
          )
          .attr(
            "y1",
            (relationship) =>
              relationship.source.y
          )
          .attr(
            "x2",
            (relationship) =>
              relationship.target.x
          )
          .attr(
            "y2",
            (relationship) =>
              relationship.target.y
          );


        linkLabel
          .attr(
            "x",
            (relationship) =>
              (
                relationship.source.x +
                relationship.target.x
              ) / 2
          )
          .attr(
            "y",
            (relationship) =>
              (
                relationship.source.y +
                relationship.target.y
              ) / 2 - 8
          );


        node.attr(
          "transform",
          (object) =>
            `translate(${object.x},${object.y})`
        );
      }
    );


    /*
     * Cleanup when the component unmounts or the
     * underlying project data changes.
     */
    return () => {
      simulation.stop();
      svg.selectAll("*").remove();
    };
  }, [
    objects,
    relationships,
    objectMap,
    onSelectObject,
  ]);


  return (
    <div className="project-graph-container">
      <svg
        ref={svgRef}
        className="project-graph"
      />
    </div>
  );
}