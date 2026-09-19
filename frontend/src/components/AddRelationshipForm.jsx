import React, { useState } from "react";

import {
  createProjectRelationship,
} from "../api/bioos";


const RELATIONSHIP_TYPES = [
  "USED_IN",
  "DERIVED_FROM",
  "SUPPORTS",
  "CONTRADICTS",
  "RELATES_TO",
];


export default function AddRelationshipForm({
  projectId,
  objects = [],
  onCreated,
  onCancel,
}) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState("USED_IN");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");


    if (objects.length < 2) {
      setError(
        "You need at least two research objects to create a relationship."
      );
      return;
    }


    if (!sourceId || !targetId) {
      setError(
        "Please select both a source and target object."
      );
      return;
    }


    if (sourceId === targetId) {
      setError(
        "Source and target objects must be different."
      );
      return;
    }


    setSaving(true);


    try {
      const relationship =
        await createProjectRelationship({
          projectId,
          sourceId,
          targetId,
          type,
        });


      setSourceId("");
      setTargetId("");
      setType("USED_IN");


      if (onCreated) {
        onCreated(relationship);
      }

    } catch (error) {
      console.error(
        "Could not create relationship:",
        error
      );

      setError(
        error.message ||
        "Could not create relationship."
      );

    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="add-relationship-card">

      <div className="add-relationship-header">

        <div>
          <div className="panel-label">
            NEW RELATIONSHIP
          </div>

          <h3>
            Connect research objects
          </h3>

          <p>
            Define how two objects in this project
            are related.
          </p>
        </div>


        <button
          type="button"
          className="add-relationship-cancel-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

      </div>


      <form
        className="add-relationship-form"
        onSubmit={handleSubmit}
      >

        <div className="add-relationship-field">

          <label htmlFor="relationship-source">
            Source
          </label>

          <select
            id="relationship-source"
            value={sourceId}
            onChange={(event) =>
              setSourceId(event.target.value)
            }
            disabled={saving}
          >
            <option value="">
              Select source object
            </option>

            {objects.map((object) => (
              <option
                key={object.id}
                value={object.id}
              >
                {object.name}
              </option>
            ))}

          </select>

        </div>


        <div className="add-relationship-field">

          <label htmlFor="relationship-type">
            Relationship
          </label>

          <select
            id="relationship-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
            disabled={saving}
          >

            {RELATIONSHIP_TYPES.map(
              (relationshipType) => (
                <option
                  key={relationshipType}
                  value={relationshipType}
                >
                  {relationshipType}
                </option>
              )
            )}

          </select>

        </div>


        <div className="add-relationship-field">

          <label htmlFor="relationship-target">
            Target
          </label>

          <select
            id="relationship-target"
            value={targetId}
            onChange={(event) =>
              setTargetId(event.target.value)
            }
            disabled={saving}
          >

            <option value="">
              Select target object
            </option>

            {objects.map((object) => (
              <option
                key={object.id}
                value={object.id}
              >
                {object.name}
              </option>
            ))}

          </select>

        </div>


        {error && (
          <div className="add-relationship-error">
            {error}
          </div>
        )}


        <div className="add-relationship-actions">

          <button
            type="button"
            className="add-relationship-secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="add-relationship-primary-button"
            disabled={
              saving ||
              objects.length < 2 ||
              !sourceId ||
              !targetId
            }
          >
            {saving
              ? "Connecting..."
              : "Connect Objects"}
          </button>

        </div>

      </form>

    </section>
  );
}