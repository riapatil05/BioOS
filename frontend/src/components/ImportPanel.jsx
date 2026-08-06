/**
 * Scientific text import panel for BioOS.
 *
 * Allows the user to paste biomedical literature or load the
 * built-in demonstration example before adding it to the graph.
 */


import React from "react";
const EXAMPLE_TEXT = `Duchenne muscular dystrophy (DMD) is a progressive X-linked muscle disorder caused by loss of dystrophin. Transcriptomic profiling of DMD skeletal muscle reveals increased expression of extracellular matrix and inflammatory genes, including SPP1 and COL1A1, alongside reduced expression of oxidative phosphorylation pathways. SPP1 expression is associated with macrophage infiltration and fibrotic remodeling. Corticosteroid treatment such as prednisone partially suppresses inflammatory signaling but does not restore dystrophin expression.`;

export default function ImportPanel({
  text,
  onTextChange,
  onImport,
  loading,
  error,
}) {
  function handleSubmit() {
    if (!text.trim() || loading) {
      return;
    }

    onImport();
  }

  function loadExample() {
    onTextChange(EXAMPLE_TEXT);
  }

  return (
    <section className="import-panel">
      <div className="panel-heading">
        <span className="panel-label">IMPORT</span>

        <button
          type="button"
          className="text-button"
          onClick={loadExample}
          disabled={loading}
        >
          Try example
        </button>
      </div>

      <textarea
        className="import-textarea"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Paste a scientific abstract or research excerpt..."
        rows={8}
        disabled={loading}
      />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button
        type="button"
        className="primary-button"
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
      >
        {loading ? "Extracting..." : "Add to graph"}
      </button>
    </section>
  );
}