import React, { useState } from "react";

import { createProjectObject } from "../api/bioos";


const OBJECT_TYPES = [
  {
    value: "dataset",
    label: "Dataset",
  },
  {
    value: "paper",
    label: "Paper",
  },
  {
    value: "code",
    label: "Code",
  },
  {
    value: "analysis",
    label: "Analysis",
  },
  {
    value: "finding",
    label: "Finding",
  },
  {
    value: "hypothesis",
    label: "Hypothesis",
  },
  {
    value: "figure",
    label: "Figure",
  },
  {
    value: "note",
    label: "Note",
  },
];


export default function AddObjectForm({
  projectId,
  onCreated,
  onCancel,
}) {
  const [type, setType] = useState("dataset");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError("Please enter a name for the research object.");
      return;
    }

    setSaving(true);

    try {
      const object = await createProjectObject({
        projectId,
        type,
        name,
        summary,
        content,
        externalUrl,
      });

      setName("");
      setSummary("");
      setContent("");
      setExternalUrl("");
      setType("dataset");

      if (onCreated) {
        onCreated(object);
      }
    } catch (error) {
      console.error(
        "Could not create research object:",
        error
      );

      setError(
        error.message ||
        "Could not create research object."
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="add-object-card">

      <div className="add-object-header">
        <div>
          <div className="panel-label">
            NEW RESEARCH OBJECT
          </div>

          <h3>
            Add to this project
          </h3>

          <p>
            Create a structured research object that
            becomes part of the project graph.
          </p>
        </div>

        <button
          type="button"
          className="add-object-cancel-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>


      <form
        className="add-object-form"
        onSubmit={handleSubmit}
      >

        <div className="add-object-field">
          <label htmlFor="object-type">
            Type
          </label>

          <select
            id="object-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >
            {OBJECT_TYPES.map((objectType) => (
              <option
                key={objectType.value}
                value={objectType.value}
              >
                {objectType.label}
              </option>
            ))}
          </select>
        </div>


        <div className="add-object-field">
          <label htmlFor="object-name">
            Name
          </label>

          <input
            id="object-name"
            type="text"
            placeholder="e.g. GSE109178 Validation Dataset"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
          />
        </div>


        <div className="add-object-field">
          <label htmlFor="object-summary">
            Summary
          </label>

          <input
            id="object-summary"
            type="text"
            placeholder="Short description of this object"
            value={summary}
            onChange={(event) =>
              setSummary(event.target.value)
            }
          />
        </div>


        <div className="add-object-field add-object-field-full">
          <label htmlFor="object-content">
            Content
          </label>

          <textarea
            id="object-content"
            placeholder="Additional research context, notes, methods, or details..."
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
            rows={4}
          />
        </div>


        <div className="add-object-field add-object-field-full">
          <label htmlFor="object-url">
            External URL
          </label>

          <input
            id="object-url"
            type="url"
            placeholder="https://..."
            value={externalUrl}
            onChange={(event) =>
              setExternalUrl(event.target.value)
            }
          />
        </div>


        {error && (
          <div className="add-object-error">
            {error}
          </div>
        )}


        <div className="add-object-actions">
          <button
            type="button"
            className="add-object-secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="add-object-primary-button"
            disabled={
              saving ||
              !name.trim()
            }
          >
            {saving
              ? "Adding..."
              : "Add Research Object"}
          </button>
        </div>

      </form>

    </section>
  );
}