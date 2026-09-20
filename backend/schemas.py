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
    """Question and graph/project state sent to the reasoning pipeline."""

    question: str

    nodes: List[GraphNode]

    edges: List[GraphEdge]

    # If supplied, retrieval is restricted to this node
    # and its immediate graph neighbourhood.
    selected_node_id: Optional[str] = None

    # If supplied, BioOS also retrieves the persistent
    # research-project context.
    project_id: Optional[str] = None


class AskResponse(BaseModel):
    """Grounded answer generated from retrieved graph context."""

    answer: str
    referenced: List[str]


# ---------------------------------------------------------------------------
# Project Layer schemas
# ---------------------------------------------------------------------------
ResearchObjectType = Literal[
    "dataset",
    "paper",
    "code",
    "analysis",
    "finding",
    "hypothesis",
    "figure",
    "note",
    "gene",
    "drug",
    "pathway",
    "disease",
]

class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    created_at: str
    updated_at: str


class ResearchObjectCreate(BaseModel):
    type: ResearchObjectType
    name: str
    summary: str = ""
    content: str = ""
    external_url: str = ""


class ResearchObjectUpdate(BaseModel):
    type: Optional[ResearchObjectType] = None
    name: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    external_url: Optional[str] = None


class ResearchObjectResponse(BaseModel):
    id: str
    project_id: str
    type: ResearchObjectType
    name: str
    summary: str
    content: str
    external_url: str
    created_at: str
    updated_at: str


class ObjectRelationshipCreate(BaseModel):
    source_id: str
    target_id: str
    type: str


class ObjectRelationshipResponse(BaseModel):
    id: str
    project_id: str
    source_id: str
    target_id: str
    type: str
    created_at: str

# ---------------------------------------------------------------------------
# Persistent project extraction import
# ---------------------------------------------------------------------------

class ExtractedObject(BaseModel):
    tempId: str
    type: str
    name: str
    summary: str = ""
    content: str = ""
    external_url: str = ""


class ExtractedRelationship(BaseModel):
    from_: str = Field(alias="from")
    to: str
    type: str

    model_config = {
        "populate_by_name": True
    }


class ProjectExtractionImport(BaseModel):
    source_text: str = ""
    title: str = "Imported Scientific Text"
    objects: List[ExtractedObject]
    relationships: List[ExtractedRelationship] = []