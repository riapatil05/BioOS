"""
BioOS API.

FastAPI backend exposing biomedical entity extraction and
graph-grounded question-answering endpoints.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

from extraction import extract_entities
from reasoning import answer_from_graph
from retrieval import retrieve_subgraph, serialize_graph_context
from schemas import (
    AskRequest,
    AskResponse,
    ExtractionRequest,
    ExtractionResult,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ObjectRelationshipCreate,
    ObjectRelationshipResponse,
    ResearchObjectCreate,
    ResearchObjectResponse,
    ResearchObjectUpdate,
)

from database import initialize_database
from projects import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
)
from objects import (
    create_object,
    delete_object,
    get_object,
    list_objects,
    update_object,
)
from relationships import (
    create_relationship,
    delete_relationship,
    list_relationships,
)
from project_context import (
    get_project_context,
    format_project_context,
)


app = FastAPI(
    title="BioOS API",
    description=(
        "Backend API for biomedical entity extraction, "
        "graph-based retrieval, and grounded research question answering."
    ),
    version="0.1.0",
)
initialize_database()
# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

# The React/Vite development server normally runs on port 5173.
# Restrict this further when deploying the application.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """Simple API health check."""

    return {
        "name": "BioOS API",
        "status": "running",
        "version": "0.1.0",
    }


# ---------------------------------------------------------------------------
# Entity extraction
# ---------------------------------------------------------------------------

@app.post(
    "/api/extract",
    response_model=ExtractionResult,
)
def extract(request: ExtractionRequest):
    """
    Extract biomedical objects and relationships from scientific text.
    """

    try:
        return extract_entities(request.text)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        print(f"Extraction error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Entity extraction failed.",
        )


# ---------------------------------------------------------------------------
# Graph-grounded question answering
# ---------------------------------------------------------------------------
@app.post(
    "/api/ask",
    response_model=AskResponse,
)
def ask(request: AskRequest):
    """
    Retrieve relevant graph context and answer a research question.

    If a project ID is supplied, persistent project context is added
    to the scientific graph context before reasoning.
    """

    try:
        retrieved_nodes, retrieved_edges = retrieve_subgraph(
            nodes=request.nodes,
            edges=request.edges,
            selected_node_id=request.selected_node_id,
        )

        graph_context = serialize_graph_context(
            nodes=retrieved_nodes,
            edges=retrieved_edges,
        )

        context = graph_context

        if request.project_id:
            persistent_project_context = get_project_context(
                request.project_id
            )

            if persistent_project_context is None:
                raise HTTPException(
                    status_code=404,
                    detail="Project not found.",
                )

            if isinstance(
                persistent_project_context,
                str,
            ):
                project_context_text = (
                    persistent_project_context
                )
            else:
                project_context_text = json.dumps(
                    persistent_project_context,
                    indent=2,
                )

            context = (
                f"{graph_context}\n\n"
                f"PROJECT CONTEXT:\n"
                f"{project_context_text}"
            )

        return answer_from_graph(
            question=request.question,
            context=context,
        )

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        print(f"Reasoning error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Graph question answering failed.",
        )


    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


    except Exception as exc:

        print(f"Reasoning error: {exc}")

        raise HTTPException(
            status_code=500,
            detail="Graph question answering failed.",
        )
# ---------------------------------------------------------------------------
# Project Layer endpoints
# ---------------------------------------------------------------------------

@app.get("/api/projects", response_model=list[ProjectResponse])
def get_projects():
    return list_projects()


@app.post("/api/projects", response_model=ProjectResponse, status_code=201)
def post_project(request: ProjectCreate):
    if not request.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Project name cannot be empty.",
        )

    return create_project(
        name=request.name,
        description=request.description,
    )


@app.get("/api/projects/{project_id}", response_model=ProjectResponse)
def get_project_by_id(project_id: str):
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return project


@app.patch("/api/projects/{project_id}", response_model=ProjectResponse)
def patch_project(project_id: str, request: ProjectUpdate):
    project = update_project(
        project_id=project_id,
        name=request.name,
        description=request.description,
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return project


@app.delete("/api/projects/{project_id}", status_code=204)
def remove_project(project_id: str):
    deleted = delete_project(project_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return None

# ---------------------------------------------------------------------------
# Research Object endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/api/projects/{project_id}/objects",
    response_model=list[ResearchObjectResponse],
)
def get_project_objects(project_id: str):
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return list_objects(project_id)


@app.post(
    "/api/projects/{project_id}/objects",
    response_model=ResearchObjectResponse,
    status_code=201,
)
def post_project_object(
    project_id: str,
    request: ResearchObjectCreate,
):
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    if not request.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Object name cannot be empty.",
        )

    return create_object(
        project_id=project_id,
        object_type=request.type,
        name=request.name,
        summary=request.summary,
        content=request.content,
        external_url=request.external_url,
    )


@app.patch(
    "/api/objects/{object_id}",
    response_model=ResearchObjectResponse,
)
def patch_object(
    object_id: str,
    request: ResearchObjectUpdate,
):
    updated = update_object(
        object_id=object_id,
        object_type=request.type,
        name=request.name,
        summary=request.summary,
        content=request.content,
        external_url=request.external_url,
    )

    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="Research object not found.",
        )

    return updated


@app.delete(
    "/api/objects/{object_id}",
    status_code=204,
)
def remove_object(object_id: str):
    deleted = delete_object(object_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Research object not found.",
        )

    return None

# ---------------------------------------------------------------------------
# Research-object relationship endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/api/projects/{project_id}/relationships",
    response_model=list[ObjectRelationshipResponse],
)
def get_project_relationships(project_id: str):
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return list_relationships(project_id)


@app.post(
    "/api/projects/{project_id}/relationships",
    response_model=ObjectRelationshipResponse,
    status_code=201,
)
def post_project_relationship(
    project_id: str,
    request: ObjectRelationshipCreate,
):
    try:
        relationship = create_relationship(
            project_id=project_id,
            source_id=request.source_id,
            target_id=request.target_id,
            relationship_type=request.type,
        )

        if relationship is None:
            raise HTTPException(
                status_code=404,
                detail="Project not found.",
            )

        return relationship

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@app.delete(
    "/api/relationships/{relationship_id}",
    status_code=204,
)
def remove_relationship(relationship_id: str):
    deleted = delete_relationship(relationship_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Relationship not found.",
        )

    return None

@app.get("/api/projects/{project_id}/context")
def project_context(project_id: str):
    context = get_project_context(project_id)

    if context is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found."
        )

    return context