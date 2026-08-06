/**
 * BioOS main application.
 *
 * Coordinates the research graph, backend API calls,
 * node selection, question answering, and derived findings.
 */

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import AskBar from "./components/AskBar";
import ImportPanel from "./components/ImportPanel";
import NodeDetails from "./components/NodeDetails";
import ResearchGraph from "./components/ResearchGraph";

import {
  askResearchGraph,
  extractResearchObjects,
} from "./api/bioos";

import {
  TYPE_META,
} from "./graph/graphConfig";

import {
  addEdge,
  addExtractionToGraph,
  addNode,
  countNodesByType,
  findNode,
} from "./graph/graphUtils";


// ---------------------------------------------------------------------------
// Main application
// ---------------------------------------------------------------------------

export default function App() {
  // -------------------------------------------------------------------------
  // Research graph state
  // -------------------------------------------------------------------------

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [selectedNodeId, setSelectedNodeId] =
    useState(null);


  // -------------------------------------------------------------------------
  // Import state
  // -------------------------------------------------------------------------

  const [importText, setImportText] =
    useState("");

  const [importLoading, setImportLoading] =
    useState(false);

  const [importError, setImportError] =
    useState("");


  // -------------------------------------------------------------------------
  // Question-answering state
  // -------------------------------------------------------------------------

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState(null);

  const [askLoading, setAskLoading] =
    useState(false);

  const [askError, setAskError] =
    useState("");


  // -------------------------------------------------------------------------
  // ID generation
  // -------------------------------------------------------------------------

  const nextIdRef = useRef(1);

  const createId = useCallback(
    (prefix = "n") => {
      const id =
        `${prefix}${nextIdRef.current}`;

      nextIdRef.current += 1;

      return id;
    },
    []
  );


  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const selectedNode = useMemo(
    () =>
      nodes.find(
        (node) =>
          node.id === selectedNodeId
      ) || null,
    [nodes, selectedNodeId]
  );


  const nodeTypes = useMemo(
    () => Object.keys(TYPE_META),
    []
  );


  const nodeCounts = useMemo(
    () =>
      countNodesByType(
        nodes,
        nodeTypes
      ),
    [nodes, nodeTypes]
  );


  // -------------------------------------------------------------------------
  // Node selection
  // -------------------------------------------------------------------------

  const handleSelectNode = useCallback(
    (nodeId) => {
      setSelectedNodeId(nodeId);
    },
    []
  );


  /**
   * Select a graph object by its exact name.
   *
   * Used by clickable [[Object Name]] references
   * returned by the reasoning pipeline.
   */
  const handleSelectReference =
    useCallback(
      (name) => {
        const normalized =
          name.trim().toLowerCase();

        const node = nodes.find(
          (candidate) =>
            candidate.name
              .trim()
              .toLowerCase() ===
            normalized
        );

        if (node) {
          setSelectedNodeId(node.id);
        }
      },
      [nodes]
    );


  // -------------------------------------------------------------------------
  // Import scientific text
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (
      !importText.trim() ||
      importLoading
    ) {
      return;
    }

    setImportLoading(true);
    setImportError("");

    try {
      // Ask the FastAPI backend to extract
      // biomedical research objects.
      const extraction =
        await extractResearchObjects(
          importText
        );


      /*
       * graphUtils operates on mutable arrays.
       *
       * We therefore copy the current React state,
       * modify those copies, and then commit the
       * new arrays back into React.
       */
      const updatedNodes =
        nodes.map((node) => ({
          ...node,
        }));

      const updatedEdges =
        edges.map((edge) => ({
          ...edge,
        }));


      const paperNode =
        addExtractionToGraph({
          extraction,
          sourceText: importText,
          nodes: updatedNodes,
          edges: updatedEdges,
          createId,
        });


      setNodes(updatedNodes);
      setEdges(updatedEdges);

      setSelectedNodeId(
        paperNode.id
      );

      setImportText("");

      // Previous answers may no longer reflect
      // the newly expanded graph.
      setAnswer(null);
      setAskError("");

    } catch (error) {
      console.error(
        "BioOS import failed:",
        error
      );

      setImportError(
        error.message ||
          "Could not extract research objects."
      );

    } finally {
      setImportLoading(false);
    }
  }


  // -------------------------------------------------------------------------
  // Ask the research graph
  // -------------------------------------------------------------------------

  async function handleAsk() {
    if (
      !question.trim() ||
      askLoading
    ) {
      return;
    }

    if (nodes.length === 0) {
      setAskError(
        "Import research into the graph before asking a question."
      );

      return;
    }

    setAskLoading(true);
    setAskError("");
    setAnswer(null);

    try {
      const result =
        await askResearchGraph({
          question,
          nodes,
          edges,
          selectedNodeId,
        });

      setAnswer(result);

    } catch (error) {
      console.error(
        "BioOS question failed:",
        error
      );

      setAskError(
        error.message ||
          "Could not answer the question."
      );

    } finally {
      setAskLoading(false);
    }
  }


  // -------------------------------------------------------------------------
  // Save generated answer as a Finding
  // -------------------------------------------------------------------------

  function handleSaveFinding() {
    if (!answer?.answer) {
      return;
    }


    /*
     * Remove [[...]] graph-reference markup before
     * storing the generated text as a Finding.
     */
    const cleanAnswer =
      answer.answer.replace(
        /\[\[(.*?)\]\]/g,
        "$1"
      );


    const updatedNodes =
      nodes.map((node) => ({
        ...node,
      }));

    const updatedEdges =
      edges.map((edge) => ({
        ...edge,
      }));


    const findingName =
      createFindingName(
        question
      );


    const findingNode = addNode({
      nodes: updatedNodes,
      type: "Finding",
      name: findingName,
      summary: cleanAnswer,
      id: createId("n"),
    });


    /*
     * Connect the finding to the currently selected
     * research object when one exists.
     */
    if (selectedNodeId) {
      addEdge({
        edges: updatedEdges,
        sourceId: findingNode.id,
        targetId: selectedNodeId,
        type: "DERIVED_FROM",
        id: createId("e"),
      });
    }


    /*
     * Also connect the finding to graph objects
     * explicitly referenced in the generated answer.
     */
    for (
      const referencedName
      of answer.referenced || []
    ) {
      const referencedNode =
        findNodeByName(
          updatedNodes,
          referencedName
        );

      if (
        !referencedNode ||
        referencedNode.id ===
          selectedNodeId
      ) {
        continue;
      }

      addEdge({
        edges: updatedEdges,
        sourceId: findingNode.id,
        targetId: referencedNode.id,
        type: "DERIVED_FROM",
        id: createId("e"),
      });
    }


    setNodes(updatedNodes);
    setEdges(updatedEdges);

    setSelectedNodeId(
      findingNode.id
    );

    setAnswer(null);
    setQuestion("");
  }


  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="bioos-app">

      {/* ---------------------------------------------------------------
          Header
      --------------------------------------------------------------- */}

      <header className="app-header">
        <div>
          <h1 className="app-title">
            BioOS
          </h1>

          <p className="app-subtitle">
            A research graph that remembers
          </p>
        </div>

        <div className="graph-summary">
          <span>
            {nodes.length} objects
          </span>

          <span className="summary-divider">
            ·
          </span>

          <span>
            {edges.length} relationships
          </span>
        </div>
      </header>


      {/* ---------------------------------------------------------------
          Main workspace
      --------------------------------------------------------------- */}

      <main className="workspace">

        {/* Left panel */}
        <aside className="left-panel">

          <ImportPanel
            text={importText}
            onTextChange={setImportText}
            onImport={handleImport}
            loading={importLoading}
            error={importError}
          />


          <ObjectLegend
            counts={nodeCounts}
          />

        </aside>


        {/* Graph */}
        <section className="graph-panel">

          <ResearchGraph
            nodes={nodes}
            edges={edges}
            selectedNodeId={
              selectedNodeId
            }
            onSelectNode={
              handleSelectNode
            }
          />

        </section>


        {/* Right panel */}
        <NodeDetails
          node={selectedNode}
          nodes={nodes}
          edges={edges}
          onSelectNode={
            handleSelectNode
          }
        />

      </main>


      {/* ---------------------------------------------------------------
          Question answering
      --------------------------------------------------------------- */}

      <AskBar
        question={question}
        onQuestionChange={
          setQuestion
        }
        onAsk={handleAsk}
        answer={answer}
        loading={askLoading}
        error={askError}
        selectedNode={
          selectedNode
        }
        onSelectReference={
          handleSelectReference
        }
        onSaveFinding={
          handleSaveFinding
        }
      />

    </div>
  );
}


// ---------------------------------------------------------------------------
// Object legend
// ---------------------------------------------------------------------------

function ObjectLegend({
  counts,
}) {
  return (
    <section className="object-legend">

      <div className="panel-label">
        OBJECTS
      </div>


      {Object.entries(
        TYPE_META
      ).map(
        ([type, meta]) => (
          <div
            className="legend-row"
            key={type}
          >
            <span
              className="legend-dot"
              style={{
                backgroundColor:
                  meta.color,
              }}
            />

            <span className="legend-label">
              {meta.label}
            </span>

            <span className="legend-count">
              {counts[type] || 0}
            </span>
          </div>
        )
      )}

    </section>
  );
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find a node by name regardless of its type.
 *
 * This is useful for resolving exact object names returned
 * by the reasoning model.
 */
function findNodeByName(
  nodes,
  name
) {
  if (!name) {
    return null;
  }

  const normalized =
    name.trim().toLowerCase();

  return (
    nodes.find(
      (node) =>
        node.name
          .trim()
          .toLowerCase() ===
        normalized
    ) || null
  );
}


/**
 * Create a short label for a Finding from the
 * question that produced it.
 */
function createFindingName(
  question
) {
  const cleaned =
    question
      .trim()
      .replace(/\s+/g, " ");

  if (!cleaned) {
    return "Derived finding";
  }

  const maxLength = 52;

  if (
    cleaned.length <= maxLength
  ) {
    return cleaned;
  }

  return (
    cleaned.slice(
      0,
      maxLength - 1
    ) + "…"
  );
}