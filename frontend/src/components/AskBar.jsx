/**
 * Graph-grounded question-answering interface for BioOS.
 */

import React from "react";

export default function AskBar({
  question,
  onQuestionChange,
  onAsk,
  answer,
  loading,
  error,
  selectedNode,
  onSelectReference,
  onSaveFinding,
}) {
  function handleSubmit(event) {
    event.preventDefault();

    if (!question.trim() || loading) {
      return;
    }

    onAsk();
  }

  return (
    <section className="ask-panel">
      {selectedNode && (
        <div className="ask-context">
          Asking about{" "}
          <strong>{selectedNode.name}</strong>
          {" "}and its connected research objects
        </div>
      )}

      <form
        className="ask-form"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className="ask-input"
          value={question}
          onChange={(event) =>
            onQuestionChange(event.target.value)
          }
          placeholder="Ask something about your research graph..."
          disabled={loading}
        />

        <button
          type="submit"
          className="ask-button"
          disabled={!question.trim() || loading}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {answer && (
        <div className="answer-card">
          <div className="answer-heading">
            BIOOS
          </div>

          <div className="answer-text">
            <AnswerWithReferences
              text={answer.answer}
              onSelectReference={onSelectReference}
            />
          </div>

          {answer.referenced?.length > 0 && (
            <div className="answer-references">
              <span className="reference-label">
                GRAPH REFERENCES
              </span>

              {answer.referenced.map((name) => (
                <button
                  type="button"
                  key={name}
                  className="reference-chip"
                  onClick={() =>
                    onSelectReference(name)
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {onSaveFinding && (
            <button
              type="button"
              className="save-finding-button"
              onClick={onSaveFinding}
            >
              Save as Finding
            </button>
          )}
        </div>
      )}
    </section>
  );
}


/**
 * Render [[Object Name]] references as clickable graph links.
 */
function AnswerWithReferences({
  text,
  onSelectReference,
}) {
  const parts = text.split(/(\[\[.*?\]\])/g);

  return parts.map((part, index) => {
    const match = part.match(
      /^\[\[(.*?)\]\]$/
    );

    if (!match) {
      return (
        <span key={index}>
          {part}
        </span>
      );
    }

    const name = match[1];

    return (
      <button
        type="button"
        key={index}
        className="inline-reference"
        onClick={() =>
          onSelectReference(name)
        }
      >
        {name}
      </button>
    );
  });
}