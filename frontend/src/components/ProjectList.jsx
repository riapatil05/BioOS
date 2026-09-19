import React, { useEffect, useState } from "react";

import {
  createProject,
  getProjects,
} from "../api/bioos";


export default function ProjectList({ onOpenProject }) {
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");


  useEffect(() => {
    loadProjects();
  }, []);


  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const result = await getProjects();
      setProjects(result);
    } catch (error) {
      console.error("Could not load projects:", error);

      setError(
        error.message ||
        "Could not load projects."
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleCreateProject(event) {
    event.preventDefault();

    if (!name.trim() || creating) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      const project = await createProject({
        name,
        description,
      });

      setProjects((current) => [
        project,
        ...current,
      ]);

      setName("");
      setDescription("");

      onOpenProject(project);

    } catch (error) {
      console.error(
        "Could not create project:",
        error
      );

      setError(
        error.message ||
        "Could not create project."
      );
    } finally {
      setCreating(false);
    }
  }


  return (
    <div className="project-list-page">

      <header className="project-list-header">
        <div>
          <div className="project-eyebrow">
            COMPBIOGRAPH
          </div>

          <h1 className="project-list-title">
            Research Projects
          </h1>

          <p className="project-list-subtitle">
            Organize datasets, analyses, findings,
            hypotheses, and scientific context.
          </p>
        </div>
      </header>


      <main className="project-list-content">

        <section className="create-project-card">

          <div className="panel-label">
            NEW PROJECT
          </div>

          <form onSubmit={handleCreateProject}>

            <input
              className="project-input"
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
            />

            <textarea
              className="project-textarea"
              placeholder="What are you investigating?"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
            />

            <button
              className="project-primary-button"
              type="submit"
              disabled={
                creating ||
                !name.trim()
              }
            >
              {creating
                ? "Creating..."
                : "Create Project"}
            </button>

          </form>

        </section>


        <section className="projects-section">

          <div className="projects-section-header">
            <div className="panel-label">
              PROJECTS
            </div>

            <button
              className="project-refresh-button"
              onClick={loadProjects}
              disabled={loading}
            >
              Refresh
            </button>
          </div>


          {error && (
            <div className="project-error">
              {error}
            </div>
          )}


          {loading ? (
            <div className="project-empty-state">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="project-empty-state">
              <strong>No projects yet.</strong>
              <span>
                Create your first research project above.
              </span>
            </div>
          ) : (
            <div className="project-grid">

              {projects.map((project) => (

                <button
                  className="project-card"
                  key={project.id}
                  onClick={() =>
                    onOpenProject(project)
                  }
                >

                  <div className="project-card-top">
                    <span className="project-card-type">
                      PROJECT
                    </span>

                    <span className="project-card-arrow">
                      →
                    </span>
                  </div>

                  <h2>
                    {project.name}
                  </h2>

                  <p>
                    {project.description ||
                      "No description yet."}
                  </p>

                  <div className="project-card-meta">
                    <span>
                      /p/{project.slug}
                    </span>
                  </div>

                </button>

              ))}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}