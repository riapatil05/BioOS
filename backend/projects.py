"""
Persistence operations for the CompBioGraph Project Layer.
"""

from datetime import datetime, timezone
from uuid import uuid4

from database import get_connection, rows_to_dicts, row_to_dict


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_slug(name: str) -> str:
    slug = "".join(
        character.lower() if character.isalnum() else "-"
        for character in name.strip()
    )

    slug = "-".join(part for part in slug.split("-") if part)

    return slug or f"project-{uuid4().hex[:8]}"


def create_project(name: str, description: str) -> dict:
    project_id = f"project-{uuid4().hex[:12]}"
    base_slug = make_slug(name)
    slug = base_slug

    connection = get_connection()

    suffix = 2
    while connection.execute(
        "SELECT 1 FROM projects WHERE slug = ?",
        (slug,),
    ).fetchone():
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    timestamp = now_iso()

    connection.execute(
        """
        INSERT INTO projects (
            id, slug, name, description, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            project_id,
            slug,
            name.strip(),
            description.strip(),
            timestamp,
            timestamp,
        ),
    )

    connection.commit()

    row = connection.execute(
        "SELECT * FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def list_projects() -> list[dict]:
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM projects
        ORDER BY updated_at DESC
        """
    ).fetchall()

    connection.close()

    return rows_to_dicts(rows)


def get_project(project_id: str) -> dict | None:
    connection = get_connection()

    row = connection.execute(
        "SELECT * FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def update_project(
    project_id: str,
    name: str | None,
    description: str | None,
) -> dict | None:
    existing = get_project(project_id)

    if existing is None:
        return None

    updated_name = name.strip() if name is not None else existing["name"]
    updated_description = (
        description.strip()
        if description is not None
        else existing["description"]
    )

    connection = get_connection()

    connection.execute(
        """
        UPDATE projects
        SET name = ?, description = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            updated_name,
            updated_description,
            now_iso(),
            project_id,
        ),
    )

    connection.commit()

    row = connection.execute(
        "SELECT * FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()

    connection.close()

    return row_to_dict(row)


def delete_project(project_id: str) -> bool:
    connection = get_connection()

    cursor = connection.execute(
        "DELETE FROM projects WHERE id = ?",
        (project_id,),
    )

    connection.commit()
    connection.close()

    return cursor.rowcount > 0