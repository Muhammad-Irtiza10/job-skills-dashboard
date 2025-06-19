import os
# Silence TensorFlow logs (0 = all, 3 = errors only)
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import json
from jinja2 import Environment, FileSystemLoader
from django.conf import settings
from transformers import pipeline, logging

# Turn off Transformers’ own warnings
logging.set_verbosity_error()

# Prepare Jinja environment
j2_env = Environment(
    loader=FileSystemLoader(settings.BASE_DIR / "templates"),
    autoescape=False,
)

# Lazy-loaded text2text generator (CPU-only, PyTorch)
_generator = None
def _get_generator():
    global _generator
    if _generator is None:
        _generator = pipeline(
            task="text2text-generation",
            model="distilgpt2",    # small, CPU-friendly
            framework="pt",        # force PyTorch
            device=-1              # CPU only
        )
    return _generator

def extract_skills_and_certs(
    text_input: str,
    domain: str = "General",
    max_skills: int = 10,
    max_certs: int = 5,
) -> list[dict]:
    """
    Renders the Jinja prompt and runs it through a local HF pipeline,
    then parses the JSON list of {skill, certification}.
    """
    # 1) Render prompt
    template = j2_env.get_template("course_extraction.jinja")
    prompt = template.render(
        description="Extract skills & certifications from this course description:",
        domain=domain,
        max_skills=max_skills,
        max_certs=max_certs,
        text_input=text_input,
        output_format='[{"skill":"...","certification":"..."}]'
    )

    # 2) Run model
    gen = _get_generator()
    out = gen(
        prompt,
        max_length=len(prompt.split()) + max_skills*5 + max_certs*10,
        do_sample=False,
    )
    generated = out[0]["generated_text"]

    # 3) Strip out echoed prompt
    if generated.startswith(prompt):
        generated = generated[len(prompt):].strip()

    # 4) Parse JSON
    try:
        return json.loads(generated)
    except json.JSONDecodeError:
        # safe fallback
        return [{"skill": "", "certification": ""}]
