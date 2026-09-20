"""
Biomedical entity and relationship extraction for BioOS.

Scientific text is sent to a locally running language model through
Ollama and converted into structured research objects and relationships.
"""

import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

from schemas import ExtractionResult


# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)


# ---------------------------------------------------------------------------
# Ollama configuration
# ---------------------------------------------------------------------------

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434/api/chat"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "gemma3:4b"
)

# ---------------------------------------------------------------------------
# Extraction prompt
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT = """
You are a biomedical entity-extraction engine for a research graph tool.

Given a snippet of scientific text, extract the most important biomedical
entities and relationships.

Respond with STRICT JSON ONLY.
Do not include markdown fences, commentary, or explanatory text.

Use exactly this schema:

{
  "title": "short title for this text (max 8 words)",
  "objects": [
    {
      "tempId": "o1",
      "type": "Gene",
      "name": "SPP1",
      "summary": "one sentence, maximum 20 words"
    }
  ],
  "relationships": [
    {
      "from": "o1",
      "to": "o2",
      "type": "ASSOCIATED_WITH"
    }
  ]
}

Allowed object types:
- Gene
- Drug
- Pathway
- Finding
- Hypothesis
- Disease

Allowed relationship types:
- SUPPORTS
- CONTRADICTS
- ASSOCIATED_WITH
- MEASURES
- TARGETS
- PART_OF

Rules:

1. Extract at most 8 objects.
2. Extract at most 8 relationships.
3. Only extract information clearly stated or strongly implied by the text.
4. Use canonical short names where possible, especially gene symbols.
5. Every object must have a unique tempId such as o1, o2, o3.
6. Relationships must only reference tempIds present in objects.
7. Do not invent biomedical claims absent from the source text.
8. Return valid JSON and nothing else.

9. Summaries must only restate information present in the supplied text.
   Do not add definitions, gene expansions, mechanisms, or background
   knowledge that is not stated in the source.

10. Preserve the semantic direction of relationships exactly as stated
    in the scientific text.

11. For TARGETS relationships, the entity doing the targeting must be
    the "from" object and the entity being targeted must be the "to"
    object.

    Examples:
    - "Osimertinib targets EGFR"
      -> Osimertinib --TARGETS--> EGFR

    - "EGFR-targeted drug Osimertinib"
      -> Osimertinib --TARGETS--> EGFR

    - "Drug X inhibits Gene Y"
      -> Drug X --TARGETS--> Gene Y

    Never reverse a TARGETS relationship merely because the target
    entity appears first in the sentence.
    
12. Use TARGETS only when the source text explicitly describes a
    biological or molecular targeting relationship.

    The target of TARGETS should normally be a Gene, protein, receptor,
    enzyme, or other molecular entity represented in the extracted
    objects.

    Do NOT use TARGETS for a disease, cancer, patient population,
    indication, or treatment population.

    For example:

    "Osimertinib targets EGFR"
    -> Osimertinib --TARGETS--> EGFR

    "Osimertinib is an EGFR-targeted drug"
    -> Osimertinib --TARGETS--> EGFR

    "Osimertinib is used for patients with EGFR-mutant lung cancer"
    -> this does NOT mean Osimertinib --TARGETS--> lung cancer.

    If a drug is described as being used for or indicated for a disease,
    extract the disease as a Disease object, but do not create a
    TARGETS relationship to that disease.

13. Extract explicitly named diseases, disorders, syndromes, cancers,
    and disease subtypes as Disease objects when they are stated in the
    source text.

    Examples:
    - "non-small cell lung cancer"
      -> Disease

    - "Duchenne muscular dystrophy"
      -> Disease

    - "breast cancer"
      -> Disease

    - "EGFR-mutant non-small cell lung cancer"
      -> Disease, using the most informative disease name supported
         by the text.

    Do not create a Disease object merely because a gene, drug, or
    pathway is commonly associated with a disease in background
    biomedical knowledge. The disease must be explicitly named or
    clearly stated in the supplied text.

14. Prefer representing explicitly stated biological processes such as
    inflammation, fibrosis, signaling, or remodeling as Pathway or Finding
    objects when they participate in a stated relationship.
"""


# ---------------------------------------------------------------------------
# Ollama helper
# ---------------------------------------------------------------------------

def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    """
    Send a prompt to the locally running Ollama server.

    Returns the text generated by the model.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
        },
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=120,
        )

        response.raise_for_status()

    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError(
            "Could not connect to Ollama. "
            "Make sure Ollama is installed and running."
        ) from exc

    except requests.exceptions.Timeout as exc:
        raise RuntimeError(
            "The local language model took too long to respond."
        ) from exc

    response_data = response.json()

    return response_data["message"]["content"]


# ---------------------------------------------------------------------------
# JSON parsing
# ---------------------------------------------------------------------------

def _parse_json_response(text: str) -> dict:
    """
    Parse JSON returned by the local language model.

    The cleanup also handles accidental markdown code fences.
    """

    cleaned = (
        text.replace("```json", "")
        .replace("```JSON", "")
        .replace("```", "")
        .strip()
    )

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start != -1 and end != -1:
        cleaned = cleaned[start:end + 1]

    try:
        return json.loads(cleaned)

    except json.JSONDecodeError as exc:
        raise ValueError(
            "The language model returned invalid JSON."
        ) from exc

def _normalize_extraction(data: dict) -> dict:
    """
    Normalize local-model extraction output before schema validation.

    Small local language models may omit optional descriptive fields
    or occasionally produce unsupported object and relationship types.
    Invalid graph elements are removed rather than silently converted
    into potentially incorrect biomedical claims.
    """

    import re

    allowed_object_types = {
        "Gene",
        "Drug",
        "Pathway",
        "Finding",
        "Hypothesis",
        "Disease",
    }

    allowed_relationship_types = {
        "SUPPORTS",
        "CONTRADICTS",
        "ASSOCIATED_WITH",
        "MEASURES",
        "TARGETS",
        "PART_OF",
    }

    normalized_objects = []

    for obj in data.get("objects", []):
        if not all(
            key in obj
            for key in ("tempId", "type", "name")
        ):
            continue

        if obj["type"] not in allowed_object_types:
            continue

        normalized_objects.append({
            "tempId": obj["tempId"],
            "type": obj["type"],
            "name": obj["name"],
            "summary": obj.get("summary", ""),
        })

    # -----------------------------------------------------------------------
    # Deterministic recovery of explicit gene symbols
    # -----------------------------------------------------------------------

    source_text = data.get("_source_text", "")

    explicit_gene_symbols = set()

    for pattern in (
        r"\b([A-Z][A-Z0-9]{1,9})-mutant\b",
        r"\b([A-Z][A-Z0-9]{1,9})-targeted\b",
        r"\btargets?\s+([A-Z][A-Z0-9]{1,9})\b",
    ):
        for match in re.findall(pattern, source_text):
            explicit_gene_symbols.add(match)

    existing_gene_names = {
        obj["name"].upper()
        for obj in normalized_objects
        if obj["type"] == "Gene"
    }

    next_index = len(normalized_objects) + 1

    for gene_symbol in sorted(explicit_gene_symbols):

        if gene_symbol in existing_gene_names:
            continue

        normalized_objects.append({
            "tempId": f"o{next_index}",
            "type": "Gene",
            "name": gene_symbol,
            "summary": (
                f"{gene_symbol} is explicitly mentioned in the supplied text."
            ),
        })

        existing_gene_names.add(gene_symbol)
        next_index += 1

    valid_ids = {
        obj["tempId"]
        for obj in normalized_objects
    }

    # -----------------------------------------------------------------------
    # Normalize model-generated relationships
    # -----------------------------------------------------------------------

    normalized_relationships = []

    for relationship in data.get("relationships", []):

        if not all(
            key in relationship
            for key in ("from", "to", "type")
        ):
            continue

        if relationship["type"] not in allowed_relationship_types:
            continue

        if (
            relationship["from"] not in valid_ids
            or relationship["to"] not in valid_ids
        ):
            continue

        if relationship["from"] == relationship["to"]:
            continue

        normalized_relationships.append({
            "from": relationship["from"],
            "to": relationship["to"],
            "type": relationship["type"],
        })

    # -----------------------------------------------------------------------
    # Deterministic relationship correction
    # -----------------------------------------------------------------------

    object_by_id = {
        obj["tempId"]: obj
        for obj in normalized_objects
    }

    # A TARGETS relationship should not point to a disease.
    normalized_relationships = [
        relationship
        for relationship in normalized_relationships
        if not (
            relationship["type"] == "TARGETS"
            and object_by_id.get(
                relationship["to"],
                {}
            ).get("type") == "Disease"
        )
    ]

        # TARGETS is directional:
    #
    #     Drug --TARGETS--> Gene
    #
    # A model-generated inverse such as:
    #
    #     Gene --TARGETS--> Drug
    #
    # is invalid for this graph schema and should be removed.
    normalized_relationships = [
        relationship
        for relationship in normalized_relationships
        if not (
            relationship["type"] == "TARGETS"
            and object_by_id.get(
                relationship["from"],
                {}
            ).get("type") == "Gene"
            and object_by_id.get(
                relationship["to"],
                {}
            ).get("type") == "Drug"
        )
    ]

    source_lower = source_text.lower()

    # -----------------------------------------------------------------------
    # Pattern 1:
    #
    # "Osimertinib is an EGFR-targeted drug"
    #
    # -> Osimertinib --TARGETS--> EGFR
    # -----------------------------------------------------------------------

    for gene in normalized_objects:

        if gene["type"] != "Gene":
            continue

        gene_name = gene["name"]

        targeted_pattern = (
            rf"\b{re.escape(gene_name)}-targeted\b"
        )

        if not re.search(
            targeted_pattern,
            source_text,
            flags=re.IGNORECASE,
        ):
            continue

        gene_id = gene["tempId"]

        for drug in normalized_objects:

            if drug["type"] != "Drug":
                continue

            drug_name = drug["name"]

            if drug_name.lower() not in source_lower:
                continue

            relationship = {
                "from": drug["tempId"],
                "to": gene_id,
                "type": "TARGETS",
            }

            if relationship not in normalized_relationships:
                normalized_relationships.append(
                    relationship
                )

    # -----------------------------------------------------------------------
    # Pattern 2:
    #
    # "Osimertinib targets EGFR"
    #
    # -> Osimertinib --TARGETS--> EGFR
    # -----------------------------------------------------------------------

    for drug in normalized_objects:

        if drug["type"] != "Drug":
            continue

        drug_name = drug["name"]

        for gene in normalized_objects:

            if gene["type"] != "Gene":
                continue

            gene_name = gene["name"]

            direct_target_pattern = (
                rf"\b{re.escape(drug_name)}\s+"
                rf"(?:directly\s+)?targets?\s+"
                rf"{re.escape(gene_name)}\b"
            )

            if not re.search(
                direct_target_pattern,
                source_text,
                flags=re.IGNORECASE,
            ):
                continue

            relationship = {
                "from": drug["tempId"],
                "to": gene["tempId"],
                "type": "TARGETS",
            }

            if relationship not in normalized_relationships:
                normalized_relationships.append(
                    relationship
                )

    return {
        "title": data.get(
            "title",
            "Untitled excerpt"
        ),
        "objects": normalized_objects,
        "relationships": normalized_relationships,
    }

# ---------------------------------------------------------------------------
# Public extraction function
# ---------------------------------------------------------------------------

def extract_entities(text: str) -> ExtractionResult:
    """
    Extract biomedical entities and relationships from scientific text.

    Parameters
    ----------
    text:
        Scientific abstract, excerpt, or other biomedical text.

    Returns
    -------
    ExtractionResult
        Structured title, biomedical objects, and relationships.
    """

    if not text or not text.strip():
        raise ValueError("Input text cannot be empty.")



    response_text = _call_ollama(
        system_prompt=EXTRACTION_PROMPT,
        user_prompt=text.strip(),
    )

    parsed = _parse_json_response(response_text)
    parsed["_source_text"] = text.strip()
    parsed = _normalize_extraction(parsed)

    try:
        return ExtractionResult.model_validate(parsed)

    except Exception as exc:
        raise ValueError(
            "The extracted data did not match the BioOS graph schema."
        ) from exc 

