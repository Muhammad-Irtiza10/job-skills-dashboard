# catalog/utils/llm_extractor.py

import json
import subprocess
from django.conf import settings
from jinja2 import Environment, FileSystemLoader
import logging

logger = logging.getLogger(__name__)

# Setup Jinja environment pointing to BASE_DIR/templates
j2_env = Environment(
    loader=FileSystemLoader(settings.BASE_DIR / "templates"),
    autoescape=False,
)

def extract_skills_and_certs(
    text_input: str,
    domain: str = "General",
    max_skills: int = 10,
    max_certs: int = 5,
) -> list[dict]:
    """
    Render the extraction prompt via Jinja, then call Ollama CLI and parse its JSON output.
    Ensures we always return a list of dicts with keys "skill" and "certification".
    """
    # 1) Build the prompt via Jinja
    try:
        template = j2_env.get_template("course_extraction.jinja")
    except Exception as e:
        logger.error(f"Jinja template error: {e}")
        # Return empty list so caller sees no skills
        return []

    prompt = (
        template.render(
            description="Extract skills & certifications from this course description:",
            domain=domain,
            max_skills=max_skills,
            max_certs=max_certs,
            text_input=text_input,
            output_format='[{"skill":"...","certification":"..."}]'
        )
        .replace("\n", " ")
    )

    cmd = [
        "ollama",
        "run",
        "--format", "json",
        "llama2:latest",
        prompt
    ]
    try:
        # Run subprocess, capture stdout as bytes, then decode manually
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=60,
        )
        # Decode stdout as UTF-8, ignoring invalid bytes
        raw = proc.stdout.decode("utf-8", errors="ignore").strip()
    except subprocess.TimeoutExpired as e:
        logger.error(f"Ollama call timed out: {e}")
        return []
    except subprocess.CalledProcessError as e:
        # Non-zero exit code: log stderr for debugging
        stderr = e.stderr.decode("utf-8", errors="ignore") if e.stderr else ""
        logger.error(f"Ollama call failed (exit {e.returncode}): {stderr}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error calling Ollama: {e}")
        return []

    if not raw:
        # No output
        return []

    # 2) Try parsing JSON
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        # Parsing failed: log raw output for debugging
        logger.error(f"JSON parse error: {e}; raw output: {raw!r}")
        # Option A: return empty
        return []
        # Option B: wrap raw as a single skill entry, e.g.:
        # return [{"skill": raw, "certification": None}]
    # 3) Ensure parsed is in expected format
    if isinstance(parsed, list):
        # Filter only dict elements, ignore others
        clean_list = []
        for item in parsed:
            if isinstance(item, dict):
                # Optionally ensure keys exist
                # If missing 'skill' or 'certification', you can set defaults
                skill = item.get("skill")
                cert = item.get("certification", None)
                if skill is None:
                    continue
                clean_list.append({"skill": skill, "certification": cert})
            else:
                # item is not dict: skip or wrap?
                logger.warning(f"Skipping non-dict item from parsed output: {item!r}")
        return clean_list
    elif isinstance(parsed, dict):
        # Single dict: wrap into list if it has 'skill'
        skill = parsed.get("skill")
        cert = parsed.get("certification", None)
        if skill:
            return [{"skill": skill, "certification": cert}]
        else:
            return []
    else:
        # Parsed is not list/dict: skip
        logger.warning(f"Parsed output is not a list or dict: {parsed!r}")
        return []
