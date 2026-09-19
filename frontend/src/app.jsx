/**
 * BioOS main application.
 *
 * Coordinates the research graph, backend API calls,
 * node selection, question answering, and derived findings.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AskBar from "./components/AskBar";
import ImportPanel from "./components/ImportPanel";
import NodeDetails from "./components/NodeDetails";
import ResearchGraph from "./components/ResearchGraph";
import ProjectList from "./components/ProjectList";
import ProjectDashboard from "./components/ProjectDashboard";

import {
  askResearchGraph,
  extractResearchObjects,
  getProjects,
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
  const [currentProject, setCurrentProject] =
    useState(null);
  useEffect(() => {
    const parts =
      window.location.pathname
        .split("/")
        .filter(Boolean);

    if (
      parts.length !== 2 ||
      parts[0] !== "p"
    ) {
      return;
    }

    const slug = parts[1];

    async function loadProjectFromUrl() {
      try {
        const projects =
          await getProjects();

        const project =
          projects.find(
            (item) =>
              item.slug === slug
          );

        if (project) {
          setCurrentProject(project);
        }
      } catch (error) {
        console.error(
          "Could not load project from URL:",
          error
        );
      }
    }

    loadProjectFromUrl();
  }, []);

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

      {!currentProject ? (
        <ProjectList
          onOpenProject={(project) => {
            setCurrentProject(project);

            window.history.pushState(
              {},
              "",
              `/p/${project.slug}`
            );
          }}
        />
      ) : (
        <ProjectDashboard
          projectId={currentProject.id}
          onBack={() => {
            setCurrentProject(null);

            window.history.pushState(
              {},
              "",
              "/"
            );
          }}
        />
      )}

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