from database import get_connection


def get_project_context(project_id: str):
    """
    Build a structured research context for a project.

    The context contains:
    - project metadata
    - research objects
    - relationships between research objects
    """

    conn = get_connection()

    try:
        project = conn.execute(
            """
            SELECT
                id,
                slug,
                name,
                description,
                created_at,
                updated_at
            FROM projects
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()

        if project is None:
            return None


        objects = conn.execute(
            """
            SELECT
                id,
                project_id,
                type,
                name,
                summary,
                content,
                external_url,
                created_at,
                updated_at
            FROM research_objects
            WHERE project_id = ?
            ORDER BY created_at ASC
            """,
            (project_id,),
        ).fetchall()


        relationships = conn.execute(
            """
            SELECT
                id,
                project_id,
                source_id,
                target_id,
                type,
                created_at
            FROM object_relationships
            WHERE project_id = ?
            ORDER BY created_at ASC
            """,
            (project_id,),
        ).fetchall()


        object_rows = [
            dict(row)
            for row in objects
        ]

        relationship_rows = [
            dict(row)
            for row in relationships
        ]


        object_map = {
            row["id"]: row
            for row in object_rows
        }


        relationship_context = []

        for relationship in relationship_rows:

            source = object_map.get(
                relationship["source_id"]
            )

            target = object_map.get(
                relationship["target_id"]
            )

            relationship_context.append({
                "id": relationship["id"],
                "source_id": relationship["source_id"],
                "source_name": (
                    source["name"]
                    if source
                    else relationship["source_id"]
                ),
                "target_id": relationship["target_id"],
                "target_name": (
                    target["name"]
                    if target
                    else relationship["target_id"]
                ),
                "type": relationship["type"],
                "created_at": relationship["created_at"],
            })


        return {
            "project": dict(project),
            "objects": object_rows,
            "relationships": relationship_context,
        }

    finally:
        conn.close()


def format_project_context(project_context):
    """
    Convert structured project context into text suitable
    for retrieval/reasoning prompts.
    """

    if not project_context:
        return ""


    project = project_context["project"]
    objects = project_context["objects"]
    relationships = project_context["relationships"]


    lines = []

    lines.append(
        f"PROJECT: {project['name']}"
    )

    if project.get("description"):
        lines.append(
            f"DESCRIPTION: {project['description']}"
        )


    lines.append("")
    lines.append("RESEARCH OBJECTS:")


    for obj in objects:

        object_type = (
            obj.get("type", "object")
            .upper()
        )

        lines.append(
            f"[{object_type}] {obj['name']}"
        )

        if obj.get("summary"):
            lines.append(
                f"Summary: {obj['summary']}"
            )

        if obj.get("content"):
            lines.append(
                f"Content: {obj['content']}"
            )

        if obj.get("external_url"):
            lines.append(
                f"External URL: {obj['external_url']}"
            )

        lines.append("")


    lines.append("RELATIONSHIPS:")


    if not relationships:
        lines.append(
            "No research object relationships."
        )

    else:

        for relationship in relationships:

            lines.append(
                f"{relationship['source_name']} "
                f"--{relationship['type']}--> "
                f"{relationship['target_name']}"
            )


    return "\n".join(lines)