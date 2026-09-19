import React, { useState } from "react";

import {
  createProjectRelationship,
} from "../api/bioos";


const RELATIONSHIP_TYPES = [
  {
    value: "SUPPORTS",
    label: "Supports",
  },
  {
    value: "USED_IN",
    label: "Used In",
  },
  {
    value: "DERIVED_FROM",
    label: "Derived From",
  },
  {
    value: "VALIDATES",
    label: "Validates",
  },
  {
    value: "PRODUCES",
    label: "Produces",
  },
  {
    value: "INFORMED_BY",
    label: "Informed By",
  },
  {
    value: "RELATED_TO",
    label: "Related To",
  },
];


export default function RelationshipForm({
  projectId,
  objects,
  onCreated,
  onCancel,
}) {
  const [sourceId, setSourceId] = useState(
    objects.length > 0
      ? objects[0].id
      : ""
  );

  const [targetId, setTargetId] = useState(
    objects.length > 1
      ? objects[1].id
      : ""
  );

  const [type, setType] = useState(
    "SUPPORTS"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

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
    <section className="relationship-form-card">

      <div className="relationship-form-header">

        <div>

          <div className="panel-label">
            NEW RELATIONSHIP
          </div>

          <h3>
            Connect research objects
          </h3>

          <p>
            Define how one research object relates
            to another.
          </p>

        </div>


        <button
          type="button"
          className="relationship-cancel-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

      </div>


      <form
        className="relationship-form"
        onSubmit={handleSubmit}
      >

        <div className="relationship-field">

          <label htmlFor="relationship-source">
            Source
          </label>

          <select
            id="relationship-source"
            value={sourceId}
            onChange={(event) =>
              setSourceId(event.target.value)
            }
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


        <div className="relationship-field">

          <label htmlFor="relationship-type">
            Relationship
          </label>

          <select
            id="relationship-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >

            {RELATIONSHIP_TYPES.map(
              (relationshipType) => (
                <option
                  key={relationshipType.value}
                  value={relationshipType.value}
                >
                  {relationshipType.label}
                </option>
              )
            )}

          </select>

        </div>


        <div className="relationship-field">

          <label htmlFor="relationship-target">
            Target
          </label>

          <select
            id="relationship-target"
            value={targetId}
            onChange={(event) =>
              setTargetId(event.target.value)
            }
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
          <div className="relationship-error">
            {error}
          </div>
        )}


        <div className="relationship-actions">

          <button
            type="button"
            className="relationship-secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="relationship-primary-button"
            disabled={
              saving ||
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