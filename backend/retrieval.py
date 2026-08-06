"""
Graph-based context retrieval for BioOS.

The retrieval strategy uses the selected research object as an anchor
and retrieves its immediate graph neighbourhood. If no node is selected,
the complete graph is used as context.
"""

from typing import List, Tuple

from schemas import GraphEdge, GraphNode


def retrieve_subgraph(
    nodes: List[GraphNode],
    edges: List[GraphEdge],
    selected_node_id: str | None = None,
) -> Tuple[List[GraphNode], List[GraphEdge]]:
    """
    Retrieve the graph context relevant to the current question.

    If a node is selected, BioOS retrieves that node and all of its
    one-hop neighbours. Otherwise, the complete graph is returned.
    """

    if not selected_node_id:
        return nodes, edges

    node_ids = {node.id for node in nodes}

    if selected_node_id not in node_ids:
        # Gracefully fall back to the complete graph if the selected
        # node no longer exists.
        return nodes, edges

    neighbour_ids = {selected_node_id}

    for edge in edges:
        if edge.source == selected_node_id:
            neighbour_ids.add(edge.target)

        if edge.target == selected_node_id:
            neighbour_ids.add(edge.source)

    retrieved_nodes = [
        node
        for node in nodes
        if node.id in neighbour_ids
    ]

    retrieved_edges = [
        edge
        for edge in edges
        if edge.source in neighbour_ids
        and edge.target in neighbour_ids
    ]

    return retrieved_nodes, retrieved_edges


def serialize_graph_context(
    nodes: List[GraphNode],
    edges: List[GraphEdge],
) -> str:
    """
    Convert a retrieved subgraph into compact text that can be supplied
    to the language model as grounded research context.
    """

    node_lookup = {
        node.id: node
        for node in nodes
    }

    object_lines = []

    for node in nodes:
        summary = node.summary or "(no summary)"

        object_lines.append(
            f"[{node.type}] {node.name}: {summary}"
        )

    relationship_lines = []

    for edge in edges:
        source = node_lookup.get(edge.source)
        target = node_lookup.get(edge.target)

        if not source or not target:
            continue

        relationship_lines.append(
            f"{source.name} --{edge.type}--> {target.name}"
        )

    objects_text = "\n".join(object_lines)
    relationships_text = "\n".join(relationship_lines)

    return (
        f"OBJECTS:\n"
        f"{objects_text}\n\n"
        f"RELATIONSHIPS:\n"
        f"{relationships_text}"
    )