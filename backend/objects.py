"""
Persistence operations for research objects and relationships.
"""

from datetime import datetime, timezone
from uuid import uuid4

from database import get_connection, rows_to_dicts, row_to_dict


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_object(
    project_id: str,
    object_type: str,
    name: str,
    summary: str = "",
    content: str = "",
    external_url: str = "",
) -> dict | None:
    connection = get_connection()

    project_exists = connection.execute(
        "SELECT 1 FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()

    if project_exists is None:
        connection.close()
        return None

    object_id = f"object-{uuid4().hex[:12]}"
    timestamp = now_iso()

    connection.execute(
        """
        INSERT INTO research_objects (
            id,
            project_id,
            type,
            name,
            summary,
            content,
            external_url,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            object_id,
            project_id,
            object_type,
            name.strip(),
            summary.strip(),
            content,
            external_url.strip(),
            timestamp,
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
        FROM research_objects
        WHERE id = ?
        """,
        (object_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def list_objects(project_id: str) -> list[dict]:
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM research_objects
        WHERE project_id = ?
        ORDER BY created_at ASC
        """,
        (project_id,),
    ).fetchall()

    connection.close()

    return rows_to_dicts(rows)


def get_object(object_id: str) -> dict | None:
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM research_objects
        WHERE id = ?
        """,
        (object_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def update_object(
    object_id: str,
    object_type: str | None = None,
    name: str | None = None,
    summary: str | None = None,
    content: str | None = None,
    external_url: str | None = None,
) -> dict | None:
    existing = get_object(object_id)

    if existing is None:
        return None

    updated_type = (
        object_type
        if object_type is not None
        else existing["type"]
    )

    updated_name = (
        name.strip()
        if name is not None
        else existing["name"]
    )

    updated_summary = (
        summary.strip()
        if summary is not None
        else existing["summary"]
    )

    updated_content = (
        content
        if content is not None
        else existing["content"]
    )

    updated_external_url = (
        external_url.strip()
        if external_url is not None
        else existing["external_url"]
    )

    timestamp = now_iso()

    connection = get_connection()

    connection.execute(
        """
        UPDATE research_objects
        SET
            type = ?,
            name = ?,
            summary = ?,
            content = ?,
            external_url = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            updated_type,
            updated_name,
            updated_summary,
            updated_content,
            updated_external_url,
            timestamp,
            object_id,
        ),
    )

    connection.execute(
        """
        UPDATE projects
        SET updated_at = ?
        WHERE id = ?
        """,
        (timestamp, existing["project_id"]),
    )

    connection.commit()

    row = connection.execute(
        """
        SELECT *
        FROM research_objects
        WHERE id = ?
        """,
        (object_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def delete_object(object_id: str) -> bool:
    existing = get_object(object_id)

    if existing is None:
        return False

    connection = get_connection()

    connection.execute(
        """
        DELETE FROM research_objects
        WHERE id = ?
        """,
        (object_id,),
    )

    connection.execute(
        """
        UPDATE projects
        SET updated_at = ?
        WHERE id = ?
        """,
        (now_iso(), existing["project_id"]),
    )

    connection.commit()
    connection.close()

    return True