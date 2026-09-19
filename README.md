# CompBioGraph

### Computational Biology Research Infrastructure — with BioOS Intelligence

CompBioGraph is a local-first research workspace for organizing computational biology research into persistent, connected research objects.

The platform combines a structured research-object layer, relationship graphs, project workspaces, and graph-grounded AI assistance through **BioOS Intelligence**.

> **Research objects → relationships → project graph → graph-grounded intelligence**

---

## What is CompBioGraph?

Computational biology research rarely consists of a single dataset, paper, or analysis.

A typical project contains:

- datasets
- papers
- analysis workflows
- findings
- hypotheses
- figures
- code
- notes
- relationships between them

These objects are often scattered across notebooks, documents, folders, and conversations.

CompBioGraph provides a persistent project layer where these research objects can be stored, connected, explored, and queried together.

**BioOS** is the intelligence layer that reasons over this structured research context.

---

## BioOS Intelligence

BioOS provides project-level question answering over the research workspace.

Instead of asking an LLM to reason over an isolated prompt, BioOS receives structured project context containing:

- research objects
- object types
- summaries and content
- relationships between objects
- the currently selected research context

Answers can reference exact research objects using structured references such as:

```text
[[GSE38417 Discovery Dataset]]
[[DMD Age Progression Analysis]]
```

These references are surfaced in the interface and can be used to navigate directly back to the corresponding research object.

The goal is to keep AI-generated reasoning grounded in the research context already present in the project.

---

# V1.2 — Persistent Research Workspace

The current release extends the original BioOS research-graph prototype into a persistent project workspace.

### Projects

Projects provide a top-level container for a research workflow.

Each project has:

- a name
- a description
- a persistent identifier
- a URL-friendly slug
- creation and modification timestamps

Projects can be opened directly through routes such as:

```text
/p/dmd-transcriptomics
```

### Research Objects

Projects can contain typed research objects including:

```text
dataset
paper
code
analysis
finding
hypothesis
figure
note
```

Each object can contain:

- name
- type
- summary
- detailed content
- external URL
- timestamps

### Relationships

Research objects can be connected through explicit relationships such as:

```text
USED_IN
DERIVED_FROM
SUPPORTS
CONTRADICTS
RELATES_TO
```

This creates a project-specific research graph rather than a collection of disconnected records.

### Project Graph

The project dashboard provides an interactive graph visualization of research objects and their relationships.

Selecting an object in the graph can navigate directly to the corresponding research-object card.

### Project Intelligence

BioOS Intelligence can answer questions over the current project's research context.

The interface surfaces referenced research objects as interactive references, allowing users to move between AI-generated answers and the underlying research objects.

---

# Example Project

A DMD transcriptomics project can be represented as:

```text
GSE38417 Discovery Dataset
          │
          │ USED_IN
          ▼
DMD Age Progression Analysis
          │
          │ SUPPORTS
          ▼
Serum Tissue Concordance Hypothesis
```

Additional relationships can be added as the research project develops.

This allows a project to evolve from a collection of individual research artifacts into a connected representation of the investigation.

---

# Architecture

```text
                    CompBioGraph
                         │
              ┌──────────┴──────────┐
              │                     │
        Project Workspace      BioOS Intelligence
              │                     │
       Research Objects       Project-grounded QA
              │                     │
        Relationships              │
              │                     │
              └──────────┬──────────┘
                         │
                  Persistent SQLite
                         │
                 FastAPI Backend
                         │
                 Local Ollama LLM
```

### Frontend

```text
React
  │
  ├── Project List
  ├── Project Dashboard
  ├── Research Object Cards
  ├── Project Graph
  └── BioOS Intelligence
```

### Backend

```text
FastAPI
  │
  ├── Project API
  ├── Research Object API
  ├── Relationship API
  ├── Project Context
  └── Graph-grounded Reasoning
```

### Persistence

The current V1.2 implementation uses SQLite for local persistence.

The local database contains:

```text
projects
research_objects
object_relationships
```

The database is intentionally kept local and is excluded from version control.

---

# Original BioOS Research Graph

The project retains the original BioOS scientific research-graph functionality.

Scientific text can be transformed into structured biomedical objects such as:

```text
Paper
Gene
Drug
Pathway
Disease
Finding
Hypothesis
```

These objects can be connected through relationships such as:

```text
SUPPORTS
CONTRADICTS
ASSOCIATED_WITH
MEASURES
TARGETS
PART_OF
RELATES_TO
DERIVED_FROM
```

The resulting graph can be explored interactively and queried using graph-grounded natural-language reasoning.

This functionality forms the scientific graph foundation underneath the newer project workspace.

---

# Why a Research Workspace?

Scientific knowledge is cumulative.

A single paper may provide a dataset, another may provide an analysis method, and a later experiment may produce a finding that changes how the earlier evidence is interpreted.

Traditional chat-based workflows often lose these connections.

CompBioGraph instead treats research as a collection of persistent objects:

```text
dataset
   ↓
analysis
   ↓
finding
   ↓
hypothesis
   ↓
new analysis
```

The resulting structure can remain available throughout the lifetime of the research project.

---

# Tech Stack

## Frontend

- **React**
- **Vite**
- **D3.js**
- **JavaScript**
- **CSS**

## Backend

- **FastAPI**
- **Python**
- **Pydantic**
- **SQLite**
- **Requests**

## Local AI

- **Ollama**
- **Gemma 3 4B (`gemma3:4b`)**

The local model is used for graph-grounded reasoning and the original scientific extraction workflow.

---

# Project Structure

```text
BioOS/
│
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── extraction.py
│   ├── objects.py
│   ├── project_context.py
│   ├── projects.py
│   ├── reasoning.py
│   ├── relationships.py
│   ├── retrieval.py
│   └── schemas.py
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── bioos.js
│       │
│       ├── components/
│       │   ├── AddObjectForm.jsx
│       │   ├── AddRelationshipForm.jsx
│       │   ├── ProjectDashboard.jsx
│       │   ├── ProjectGraph.jsx
│       │   ├── ProjectIntelligence.jsx
│       │   ├── ProjectList.jsx
│       │   └── ...
│       │
│       ├── graph/
│       ├── app.jsx
│       ├── main.jsx
│       └── styles.css
│
├── notebooks/
├── examples/
├── assets/
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

---

# Installation

## Prerequisites

Install:

- Python 3.10+
- Node.js
- npm
- Ollama
- Git

---

## 1. Clone the repository

```bash
git clone https://github.com/riapatil05/BioOS.git
cd BioOS
```

---

## 2. Create a Python environment

### Windows

```powershell
py -m venv .venv
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Install Ollama model

BioOS uses Ollama for local model inference.

```bash
ollama pull gemma3:4b
```

Verify:

```bash
ollama list
```

---

## 5. Configure environment

Copy the environment template.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Default configuration:

```dotenv
BIOOS_HOST=127.0.0.1
BIOOS_PORT=8000

OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=gemma3:4b

VITE_API_BASE_URL=http://127.0.0.1:8000
```

The `.env` file is excluded from Git.

---

# Running the Application

## Start the backend

From the project root:

```powershell
cd backend
python -m uvicorn app:app --reload
```

If Windows does not resolve `python` correctly:

```powershell
py -m uvicorn app:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

If PowerShell blocks `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# API Overview

The backend exposes APIs for both the original scientific graph and the persistent project workspace.

## Scientific Graph

### Extract research objects

```text
POST /api/extract
```

Converts scientific text into structured biomedical objects and relationships.

### Ask the research graph

```text
POST /api/ask
```

Answers questions using supplied graph context.

---

## Project Workspace

### Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/{project_id}
PUT    /api/projects/{project_id}
DELETE /api/projects/{project_id}
```

### Research Objects

```text
GET    /api/projects/{project_id}/objects
POST   /api/projects/{project_id}/objects
GET    /api/projects/{project_id}/objects/{object_id}
PUT    /api/projects/{project_id}/objects/{object_id}
DELETE /api/projects/{project_id}/objects/{object_id}
```

### Relationships

```text
GET    /api/projects/{project_id}/relationships
POST   /api/projects/{project_id}/relationships
DELETE /api/projects/{project_id}/relationships/{relationship_id}
```

### Project Context

```text
GET /api/projects/{project_id}/context
```

Returns the structured research context used by BioOS Intelligence.

---

# Example Workflow

A typical workflow can look like:

```text
Create Project
      ↓
Add Dataset
      ↓
Add Analysis
      ↓
Add Finding / Hypothesis
      ↓
Connect Research Objects
      ↓
Explore Project Graph
      ↓
Ask BioOS
      ↓
Navigate from AI references
      ↓
Update the research workspace
```

For example:

```text
Project
└── DMD Transcriptomics
    │
    ├── Dataset
    │   └── GSE38417 Discovery Dataset
    │
    ├── Analysis
    │   └── DMD Age Progression Analysis
    │
    └── Hypothesis
        └── Serum Tissue Concordance Hypothesis
```

---

# Evaluation

The repository also contains the original BioOS evaluation notebooks covering:

- biomedical entity extraction
- relationship extraction
- multi-document graph construction
- graph-grounded question answering

The original prototype evaluation demonstrated high precision on the manually curated benchmark while showing lower recall for some object categories, particularly diseases and pathways.

These experiments are intended as engineering evaluations of the prototype rather than comprehensive biomedical benchmarks.

---

# Current Limitations

CompBioGraph/BioOS is a research prototype.

### Local model dependency

Reasoning quality and latency depend on the selected Ollama model and available hardware.

### Entity resolution

The scientific extraction layer does not yet provide comprehensive ontology-aware resolution of aliases, synonyms, and identifiers.

### Evidence validation

BioOS grounds its answers in the research context supplied to it but does not independently validate scientific claims against external biomedical databases.

### Provenance

The project workspace currently stores structured research objects and relationships, but richer provenance linking every claim to specific source passages remains an area for future development.

### Scale

SQLite provides a simple local persistence layer for the current prototype. Larger research deployments may require more specialized storage and retrieval infrastructure.

---

# Roadmap

Potential future directions include:

- ontology-aware biomedical entity resolution
- richer dataset and paper ingestion
- PDF/literature ingestion
- source-level provenance tracking
- semantic research-object retrieval
- evidence and contradiction tracking
- automated research-object creation from analyses
- graph-assisted hypothesis generation
- larger biomedical evaluation benchmarks
- scalable graph storage
- collaborative research workspaces

---

# Design Philosophy

CompBioGraph is not intended to replace scientific reading, analysis, or judgment.

The goal is to provide a persistent computational layer around research so that important objects, relationships, findings, and hypotheses can remain connected and queryable throughout a project.

> **Research should not disappear when the conversation ends.**

---

# Author

**Ria Patil**

B.Tech, Pharmaceutical Engineering and Technology  
Indian Institute of Technology (BHU), Varanasi

CompBioGraph/BioOS was developed as an exploration of:

- computational biology
- biomedical information extraction
- knowledge graphs
- persistent research infrastructure
- local language models
- graph-grounded reasoning

---

# License

This project is licensed under the MIT License.

See [`LICENSE`](LICENSE) for details.
