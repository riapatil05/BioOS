"""
BioOS API.

FastAPI backend exposing biomedical entity extraction and
graph-grounded question-answering endpoints.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from extraction import extract_entities
from reasoning import answer_from_graph
from retrieval import retrieve_subgraph, serialize_graph_context
from schemas import (
    AskRequest,
    AskResponse,
    ExtractionRequest,
    ExtractionResult,
)


app = FastAPI(
    title="BioOS API",
    description=(
        "Backend API for biomedical entity extraction, "
        "graph-based retrieval, and grounded research question answering."
    ),
    version="0.1.0",
)

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
    """

    try:
        retrieved_nodes, retrieved_edges = retrieve_subgraph(
            nodes=request.nodes,
            edges=request.edges,
            selected_node_id=request.selected_node_id,
        )

        context = serialize_graph_context(
            nodes=retrieved_nodes,
            edges=retrieved_edges,
        )

        return answer_from_graph(
            question=request.question,
            context=context,
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