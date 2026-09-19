"""
Persistence operations for research-object relationships.
"""

from datetime import datetime, timezone
from uuid import uuid4

from database import get_connection, rows_to_dicts, row_to_dict


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_relationship(
    project_id: str,
    source_id: str,
    target_id: str,
    relationship_type: str,
) -> dict | None:
    connection = get_connection()

    project_exists = connection.execute(
        "SELECT 1 FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()

    if project_exists is None:
        connection.close()
        return None

    source_exists = connection.execute(
        """
        SELECT 1
        FROM research_objects
        WHERE id = ? AND project_id = ?
        """,
        (source_id, project_id),
    ).fetchone()

    target_exists = connection.execute(
        """
        SELECT 1
        FROM research_objects
        WHERE id = ? AND project_id = ?
        """,
        (target_id, project_id),
    ).fetchone()

    if source_exists is None or target_exists is None:
        connection.close()
        raise ValueError(
            "Both source and target objects must belong to the project."
        )

    if source_id == target_id:
        connection.close()
        raise ValueError(
            "An object cannot be related to itself."
        )

    relationship_id = f"relationship-{uuid4().hex[:12]}"
    timestamp = now_iso()

    connection.execute(
        """
        INSERT INTO object_relationships (
            id,
            project_id,
            source_id,
            target_id,
            type,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            relationship_id,
            project_id,
            source_id,
            target_id,
            relationship_type.strip(),
            timestamp,
        ),
    )

    connection.execute(
        """
        UPDATE projects
        SET updated_at = ?
        WHERE id = ?
        """,
        (timestamp, project_id),
    )

    connection.commit()

    row = connection.execute(
        """
        SELECT *
        FROM object_relationships
        WHERE id = ?
        """,
        (relationship_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def list_relationships(project_id: str) -> list[dict]:
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM object_relationships
        WHERE project_id = ?
        ORDER BY created_at ASC
        """,
        (project_id,),
    ).fetchall()

    connection.close()

    return rows_to_dicts(rows)


def delete_relationship(relationship_id: str) -> bool:
    connection = get_connection()

    relationship = connection.execute(
        """
        SELECT project_id
        FROM object_relationships
        WHERE id = ?
        """,
        (relationship_id,),
    ).fetchone()

    if relationship is None:
        connection.close()
        return False

    connection.execute(
        """
        DELETE FROM object_relationships
        WHERE id = ?
        """,
        (relationship_id,),
    )

    connection.execute(
        """
        UPDATE projects
        SET updated_at = ?
        WHERE id = ?
        """,
        (now_iso(), relationship["project_id"]),
    )

    connection.commit()
    connection.close()

    return True