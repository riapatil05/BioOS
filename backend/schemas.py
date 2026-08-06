"""
Pydantic schemas used by the BioOS API.

These models define the structure of research graph objects,
relationships, extraction results, and question-answering requests.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Graph types
# ---------------------------------------------------------------------------

NodeType = Literal[
    "Paper",
    "Gene",
    "Drug",
    "Pathway",
    "Finding",
    "Hypothesis",
    "Disease",
]

RelationshipType = Literal[
    "MENTIONS",
    "SUPPORTS",
    "CONTRADICTS",
    "ASSOCIATED_WITH",
    "MEASURES",
    "TARGETS",
    "PART_OF",
    "RELATES_TO",
    "DERIVED_FROM",
]


# ---------------------------------------------------------------------------
# Extraction schemas
# ---------------------------------------------------------------------------

class ExtractedObject(BaseModel):
    """A biomedical object extracted from scientific text."""

    tempId: str
    type: Literal[
        "Gene",
        "Drug",
        "Pathway",
        "Finding",
        "Hypothesis",
        "Disease",
    ]
    name: str
    summary: str = ""


class ExtractedRelationship(BaseModel):
    """A relationship between two extracted biomedical objects."""

    from_id: str = Field(alias="from")
    to_id: str = Field(alias="to")
    type: Literal[
        "SUPPORTS",
        "CONTRADICTS",
        "ASSOCIATED_WITH",
        "MEASURES",
        "TARGETS",
        "PART_OF",
    ]

    model_config = {
        "populate_by_name": True
    }


class ExtractionResult(BaseModel):
    """Structured result returned by the entity-extraction pipeline."""

    title: str
    objects: List[ExtractedObject]
    relationships: List[ExtractedRelationship]


class ExtractionRequest(BaseModel):
    """Text submitted by the frontend for biomedical extraction."""

    text: str


# ---------------------------------------------------------------------------
# Research graph schemas
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    """A node in the BioOS research graph."""

    id: str
    type: NodeType
    name: str
    summary: str = ""


class GraphEdge(BaseModel):
    """A directed relationship between two research graph nodes."""

    id: Optional[str] = None
    source: str
    target: str
    type: RelationshipType


# ---------------------------------------------------------------------------
# Question-answering schemas
# ---------------------------------------------------------------------------

class AskRequest(BaseModel):
    """Question and graph state sent to the reasoning pipeline."""

    question: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]

    # If supplied, retrieval is restricted to this node
    # and its immediate graph neighbourhood.
    selected_node_id: Optional[str] = None


class AskResponse(BaseModel):
    """Grounded answer generated from retrieved graph context."""

    answer: str
    referenced: List[str]