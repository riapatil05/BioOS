import React, { useState } from "react";

import {
  extractResearchObjects,
  importExtractionToProject,
} from "../api/bioos";


export default function ProjectExtractionImport({
  projectId,
  onImported,
}) {
  const [sourceText, setSourceText] = useState("");
  const [extraction, setExtraction] = useState(null);

  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  async function handleExtract() {
    if (!sourceText.trim()) {
      setError("Paste scientific text first.");
      return;
    }

    setError("");
    setSuccess("");
    setExtraction(null);
    setExtracting(true);

    try {
      const result =
        await extractResearchObjects(sourceText);

      setExtraction(result);

    } catch (error) {
      console.error(
        "BioOS extraction failed:",
        error
      );

      setError(
        error.message ||
        "BioOS could not extract research objects."
      );

    } finally {
      setExtracting(false);
    }
  }


  async function handleImport() {
    if (!extraction) {
      return;
    }

    setError("");
    setSuccess("");
    setImporting(true);

    try {
      const result =
        await importExtractionToProject(
          projectId,
          extraction,
          sourceText
        );

      setSuccess(
        `Added ${result.objects_created} new object(s) and ` +
        `${result.relationships_created} new relationship(s) ` +
        `to this project.`
      );

      setExtraction(null);

      if (onImported) {
        await onImported();
      }

    } catch (error) {
      console.error(
        "Could not import extraction:",
        error
      );

      setError(
        error.message ||
        "Could not add the extraction to this project."
      );

    } finally {
      setImporting(false);
    }
  }


  function handleClear() {
    setSourceText("");
    setExtraction(null);
    setError("");
    setSuccess("");
  }


  return (
    <section className="dashboard-section project-extraction-section">

      <div className="dashboard-section-header">

        <div>
          <div className="panel-label">
            BIOOS EXTRACTION
          </div>

          <p>
            Extract research objects and relationships
            from scientific text and add them to this project.
          </p>
        </div>

      </div>


      <textarea
        className="project-extraction-input"
        value={sourceText}
        onChange={(event) =>
          setSourceText(event.target.value)
        }
        placeholder={
          "Paste a scientific abstract, paper excerpt, " +
          "or research note here..."
        }
        rows={8}
        disabled={extracting || importing}
      />


      <div className="project-extraction-actions">

        <button
          className="dashboard-add-object-button"
          onClick={handleExtract}
          disabled={
            extracting ||
            importing ||
            !sourceText.trim()
          }
        >
          {extracting
            ? "Extracting..."
            : "Extract Research Objects"}
        </button>


        {(sourceText || extraction) && (
          <button
            className="dashboard-back-button"
            onClick={handleClear}
            disabled={extracting || importing}
          >
            Clear
          </button>
        )}

      </div>


      {error && (
        <div className="project-extraction-error">
          {error}
        </div>
      )}


      {success && (
        <div className="project-extraction-success">
          {success}
        </div>
      )}


      {extraction && (
        <div className="project-extraction-review">

          <div className="project-extraction-review-header">

            <div>
              <div className="panel-label">
                EXTRACTION PREVIEW
              </div>

              <h3>
                {extraction.title ||
                  "Extracted Research Objects"}
              </h3>
            </div>

            <div className="project-extraction-count">
              {extraction.objects?.length || 0} objects
              {" · "}
              {extraction.relationships?.length || 0} relationships
            </div>

          </div>


          <div className="project-extraction-object-list">

            {(extraction.objects || []).map((object) => (
              <div
                className="project-extraction-object"
                key={object.tempId}
              >

                <div className="project-extraction-object-type">
                  {object.type}
                </div>

                <div className="project-extraction-object-name">
                  {object.name}
                </div>

                {object.summary && (
                  <div className="project-extraction-object-summary">
                    {object.summary}
                  </div>
                )}

              </div>
            ))}

          </div>


          {extraction.relationships?.length > 0 && (
            <div className="project-extraction-relationships">

              <div className="panel-label">
                RELATIONSHIPS
              </div>

              {extraction.relationships.map(
                (relationship, index) => {

                  const source =
                    extraction.objects?.find(
                      (object) =>
                        object.tempId === relationship.from
                    );

                  const target =
                    extraction.objects?.find(
                      (object) =>
                        object.tempId === relationship.to
                    );

                  return (
                    <div
                      className="project-extraction-relationship"
                      key={`${relationship.from}-${relationship.to}-${index}`}
                    >
                      <span>
                        {source?.name ||
                          relationship.from}
                      </span>

                      <strong>
                        {relationship.type}
                      </strong>

                      <span>
                        {target?.name ||
                          relationship.to}
                      </span>
                    </div>
                  );
                }
              )}

            </div>
          )}


          <div className="project-extraction-import-actions">

            <button
              className="dashboard-add-object-button"
              onClick={handleImport}
              disabled={
                importing ||
                !extraction.objects?.length
              }
            >
              {importing
                ? "Adding to Project..."
                : "Add Extraction to Project"}
            </button>

          </div>

        </div>
      )}

    </section>
  );
}