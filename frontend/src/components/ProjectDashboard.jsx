import React, { useEffect, useState } from "react";

import {
  getProject,
  getProjectObjects,
  getProjectRelationships,
} from "../api/bioos";

import ProjectGraph from "./ProjectGraph";
import AddObjectForm from "./AddObjectForm";
import AddRelationshipForm from "./AddRelationshipForm";
import ProjectIntelligence from "./ProjectIntelligence";


const OBJECT_META = {
  dataset: {
    label: "DATASET",
    symbol: "▣",
  },
  paper: {
    label: "PAPER",
    symbol: "▤",
  },
  code: {
    label: "CODE",
    symbol: "⌘",
  },
  analysis: {
    label: "ANALYSIS",
    symbol: "◈",
  },
  finding: {
    label: "FINDING",
    symbol: "◆",
  },
  hypothesis: {
    label: "HYPOTHESIS",
    symbol: "?",
  },
  figure: {
    label: "FIGURE",
    symbol: "▧",
  },
  note: {
    label: "NOTE",
    symbol: "✎",
  },
};


export default function ProjectDashboard({
  projectId,
  onBack,
}) {
  const [project, setProject] = useState(null);
  const [objects, setObjects] = useState([]);
  const [relationships, setRelationships] = useState([]);

  const [showAddObject, setShowAddObject] = useState(false);
  const [showAddRelationship, setShowAddRelationship] =
    useState(false);

  const [selectedObjectId, setSelectedObjectId] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    loadDashboard();
  }, [projectId]);


  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        projectData,
        objectData,
        relationshipData,
      ] = await Promise.all([
        getProject(projectId),
        getProjectObjects(projectId),
        getProjectRelationships(projectId),
      ]);

      setProject(projectData);
      setObjects(objectData);
      setRelationships(relationshipData);

    } catch (error) {
      console.error(
        "Could not load project dashboard:",
        error
      );

      setError(
        error.message ||
        "Could not load project."
      );

    } finally {
      setLoading(false);
    }
  }


  async function handleObjectCreated() {
    setShowAddObject(false);

    try {
      const updatedObjects =
        await getProjectObjects(projectId);

      setObjects(updatedObjects);

    } catch (error) {
      console.error(
        "Could not refresh research objects:",
        error
      );

      setError(
        error.message ||
        "Research object was created, but the dashboard could not be refreshed."
      );
    }
  }


  async function handleRelationshipCreated() {
    setShowAddRelationship(false);

    try {
      const updatedRelationships =
        await getProjectRelationships(projectId);

      setRelationships(updatedRelationships);

    } catch (error) {
      console.error(
        "Could not refresh relationships:",
        error
      );

      setError(
        error.message ||
        "Relationship was created, but the dashboard could not be refreshed."
      );
    }
  }


  function handleSelectObject(object) {
    if (!object) {
      return;
    }

    setSelectedObjectId(object.id);

    setTimeout(() => {
      const element =
        document.getElementById(
          `research-object-${object.id}`
        );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 50);
  }


  function getObject(objectId) {
    return objects.find(
      (object) => object.id === objectId
    );
  }


  if (loading) {
    return (
      <div className="project-dashboard">
        <div className="dashboard-loading">
          Loading project...
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="project-dashboard">

        <button
          className="dashboard-back-button"
          onClick={onBack}
        >
          ← Projects
        </button>

        <div className="project-error">
          {error}
        </div>

      </div>
    );
  }


  if (!project) {
    return null;
  }


  return (
    <div className="project-dashboard">

      <header className="dashboard-header">

        <div>

          <button
            className="dashboard-back-button"
            onClick={onBack}
          >
            ← Projects
          </button>

          <div className="project-eyebrow">
            RESEARCH PROJECT
          </div>

          <h1 className="dashboard-title">
            {project.name}
          </h1>

          <p className="dashboard-description">
            {project.description ||
              "No project description yet."}
          </p>

        </div>


        <div className="dashboard-stats">

          <div className="dashboard-stat">
            <div className="dashboard-stat-value">
              {objects.length}
            </div>

            <div className="dashboard-stat-label">
              objects
            </div>
          </div>


          <div className="dashboard-stat">
            <div className="dashboard-stat-value">
              {relationships.length}
            </div>

            <div className="dashboard-stat-label">
              relationships
            </div>
          </div>

        </div>

      </header>


      <section className="dashboard-section project-graph-section">

        <div className="dashboard-section-header">

          <div>

            <h2 className="dashboard-section-title">
              Project Graph
            </h2>

            <div className="dashboard-section-subtitle">
              How research objects are connected within this project.
            </div>

          </div>


          <button
            className="dashboard-add-object-button"
            onClick={() =>
              setShowAddObject(true)
            }
          >
            + Add Research Object
          </button>

        </div>


        {showAddObject && (
          <AddObjectForm
            projectId={projectId}
            onCreated={handleObjectCreated}
            onCancel={() =>
              setShowAddObject(false)
            }
          />
        )}


        <ProjectGraph
          objects={objects}
          relationships={relationships}
          onSelectObject={handleSelectObject}
        />

      </section>


      <ProjectIntelligence
        projectId={projectId}
        objects={objects}
        onSelectObject={handleSelectObject}
      />


      <main className="dashboard-content">

        <section className="dashboard-section">

          <div className="dashboard-section-header">

            <div>

              <div className="panel-label">
                RESEARCH OBJECTS
              </div>

              <p>
                Structured objects belonging to this
                research project.
              </p>

            </div>

          </div>


          {objects.length === 0 ? (

            <div className="dashboard-empty">
              No research objects yet.
            </div>

          ) : (

            <div className="research-object-grid">

              {objects.map((object) => {

                const meta =
                  OBJECT_META[object.type] ||
                  {
                    label: object.type.toUpperCase(),
                    symbol: "•",
                  };


                const isSelected =
                  selectedObjectId === object.id;


                return (
                  <article
                    id={`research-object-${object.id}`}
                    className={
                      isSelected
                        ? "research-object-card research-object-card-selected"
                        : "research-object-card"
                    }
                    key={object.id}
                  >

                    <div className="research-object-type">

                      <span>
                        {meta.symbol}
                      </span>

                      {meta.label}

                    </div>


                    <h2>
                      {object.name}
                    </h2>


                    <p>
                      {object.summary ||
                        "No summary yet."}
                    </p>


                    {object.external_url && (
                      <a
                        href={object.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="research-object-link"
                      >
                        Open external source →
                      </a>
                    )}

                  </article>
                );

              })}

            </div>

          )}

        </section>


        <section className="dashboard-section">

          <div className="dashboard-section-header">

            <div>

              <div className="panel-label">
                RELATIONSHIPS
              </div>

              <p>
                How research objects are connected.
              </p>

            </div>


            <button
              className="dashboard-add-object-button"
              onClick={() =>
                setShowAddRelationship(true)
              }
              disabled={objects.length < 2}
            >
              + Connect Objects
            </button>

          </div>


          {showAddRelationship && (
            <AddRelationshipForm
              projectId={projectId}
              objects={objects}
              onCreated={handleRelationshipCreated}
              onCancel={() =>
                setShowAddRelationship(false)
              }
            />
          )}


          {relationships.length === 0 ? (

            <div className="dashboard-empty">
              No relationships yet.
            </div>

          ) : (

            <div className="relationship-list">

              {relationships.map((relationship) => {

                const source =
                  getObject(
                    relationship.source_id
                  );

                const target =
                  getObject(
                    relationship.target_id
                  );


                return (
                  <div
                    className="relationship-row"
                    key={relationship.id}
                  >

                    <span className="relationship-object">
                      {source?.name ||
                        relationship.source_id}
                    </span>


                    <span className="relationship-type">
                      {relationship.type}
                    </span>


                    <span className="relationship-arrow">
                      →
                    </span>


                    <span className="relationship-object">
                      {target?.name ||
                        relationship.target_id}
                    </span>

                  </div>
                );

              })}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}