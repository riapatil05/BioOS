import React, { useState } from "react";

import {
  askResearchGraph,
} from "../api/bioos";


export default function ProjectIntelligence({
  projectId,
  objects = [],
  onSelectObject,
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  async function handleAsk(event) {
    event.preventDefault();

    if (!question.trim() || loading) {
      return;
    }

    if (objects.length === 0) {
      setError(
        "Add research objects to the project before asking a question."
      );
      return;
    }

    setLoading(true);
    setError("");
    setAnswer(null);

    try {
      const result = await askResearchGraph({
        question,
        nodes: [],
        edges: [],
        selectedNodeId: null,
        projectId,
      });

      setAnswer(result);

    } catch (error) {
      console.error(
        "BioOS project question failed:",
        error
      );

      setError(
        error.message ||
        "Could not answer the question."
      );

    } finally {
      setLoading(false);
    }
  }


  function getObjectByName(name) {
    return objects.find(
      (object) =>
        object.name === name
    );
  }


  function renderAnswer(text) {
    if (!text) {
      return null;
    }

    const parts = text.split(
      /(\[\[[^\]]+\]\])/
    );

    return parts.map((part, index) => {

      const match =
        part.match(
          /^\[\[([^\]]+)\]\]$/
        );

      if (!match) {
        return (
          <React.Fragment key={index}>
            {part}
          </React.Fragment>
        );
      }

      const objectName =
        match[1];

      const object =
        getObjectByName(objectName);


      if (!object) {
        return (
          <span key={index}>
            {objectName}
          </span>
        );
      }


      return (
        <button
          key={index}
          type="button"
          className="project-intelligence-inline-reference"
          onClick={() =>
            onSelectObject &&
            onSelectObject(object)
          }
        >
          {object.name}
        </button>
      );
    });
  }


  return (
    <section className="dashboard-section project-intelligence-section">

      <div className="dashboard-section-header">

        <div>

          <div className="panel-label">
            BIOOS INTELLIGENCE
          </div>

          <h2 className="dashboard-section-title">
            Ask about this research
          </h2>

          <div className="dashboard-section-subtitle">
            Ask questions using the research context
            stored in this project.
          </div>

        </div>

      </div>


      <form
        className="project-intelligence-form"
        onSubmit={handleAsk}
      >

        <input
          className="project-intelligence-input"
          type="text"
          placeholder="e.g. What evidence supports the DMD age-progression analysis?"
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
        />

        <button
          className="project-intelligence-button"
          type="submit"
          disabled={
            loading ||
            !question.trim() ||
            objects.length === 0
          }
        >
          {loading
            ? "Thinking..."
            : "Ask BioOS"}
        </button>

      </form>


      {error && (
        <div className="project-intelligence-error">
          {error}
        </div>
      )}


      {answer && (
        <div className="project-intelligence-answer">

          <div className="project-intelligence-answer-label">
            ANSWER
          </div>

          <div className="project-intelligence-answer-text">
            {renderAnswer(answer.answer)}
          </div>


          {answer.referenced &&
            answer.referenced.length > 0 && (
              <div className="project-intelligence-references">

                <div className="project-intelligence-reference-label">
                  REFERENCED RESEARCH OBJECTS
                </div>

                <div className="project-intelligence-reference-list">

                  {answer.referenced.map(
                    (name) => {

                      const object =
                        getObjectByName(name);

                      return (
                        <button
                          type="button"
                          className="project-intelligence-reference"
                          key={name}
                          onClick={() =>
                            object &&
                            onSelectObject &&
                            onSelectObject(object)
                          }
                        >
                          {name}
                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            )}

        </div>
      )}


      {objects.length === 0 && (
        <div className="project-intelligence-empty">
          Add research objects to start asking questions
          about this project.
        </div>
      )}

    </section>
  );
}