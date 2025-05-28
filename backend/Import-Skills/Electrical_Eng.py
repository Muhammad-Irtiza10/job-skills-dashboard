#!/usr/bin/env python
import os
import re
import fitz                     # PyMuPDF for PDF reading
import spacy
from spacy.matcher import PhraseMatcher
from spacy.util import get_package_path, is_package
from spacy.cli import download as spacy_download

MODEL_NAME = "en_core_web_sm"
if not is_package(MODEL_NAME):
    spacy_download(MODEL_NAME)
nlp = spacy.load(MODEL_NAME)

# ─── DJANGO SETUP ───────────────────────────────────────────────────────────────
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "skillgap_project.settings")
import django
django.setup()
from catalog.models import Major, Skill

# ─── CONFIG ─────────────────────────────────────────────────────────────────────
PDF_PATH   = r"docs\Bachelor of Science in Electrical and Electronics Engineering.pdf"
MAJOR_NAME = "B.Sc. Electrical and Electronics Engineering" 

SKILL_TERMS = [
    "news reporting","broadcast journalism","public relations writing",
    "multimedia storytelling","visual storytelling","digital media",
    "interactive multimedia","media ethics","critical thinking",
    "research methodologies","public relations","multimedia practices",
    "communications technology",
]

# ─── HEADER EXTRACTION ──────────────────────────────────────────────────────────
def extract_header_text(path, y_threshold=150):
    """
    Read only the first page’s text blocks whose top y0 < y_threshold,
    return their concatenated text in reading order.
    """
    blocks = []
    with fitz.open(path) as doc:
        first_page = doc[0]
        for blk in first_page.get_text("blocks"):
            # blk might be (x0,y0,x1,y1, text, block_no, ...); take first five
            x0, y0, x1, y1, block_text = blk[:5]
            if y0 < y_threshold:
                blocks.append((y0, block_text.strip()))
    # sort by y0 so top-to-bottom order
    blocks.sort(key=lambda item: item[0])
    return "\n".join(text for _, text in blocks)

def parse_header(raw_header, max_sents=2):
    """
    From the top-of-page raw_header:
      - split into non-blank lines
      - line0 = department
      - line1 = major (skipped)
      - lines2+ until blank = description
      - truncate description to max_sents sentences
    """
    lines = [ln.strip() for ln in raw_header.split("\n") if ln.strip()]
    if len(lines) < 3:
        return "", ""
    department = lines[0]
    desc_lines = []
    for ln in lines[2:]:
        if not ln.strip():
            break
        desc_lines.append(ln)
    full_para = " ".join(desc_lines)
    full_para = re.sub(r"\s+", " ", full_para)
    sentences = re.split(r'(?<=[\.!?])\s+', full_para)
    return department, " ".join(sentences[:max_sents]).strip()

# ─── 1) PARSE HEADER ────────────────────────────────────────────────────────────
raw_header  = extract_header_text(PDF_PATH, y_threshold=150)
department, description = parse_header(raw_header)
print("Parsed Department:", department)
print("Parsed Description:", description, "\n")

# ─── 2) EXTRACT FULL TEXT ───────────────────────────────────────────────────────
def extract_full_text(path):
    txt = ""
    with fitz.open(path) as doc:
        for page in doc:
            txt += page.get_text("text")
    return txt

raw_full = extract_full_text(PDF_PATH)
normalized = re.sub(r"\s+", " ", raw_full)
normalized = re.sub(r"(?i)([a-z])[-–—]([a-z])", r"\1 \2", normalized)

# ─── 3) RUN PHRASEMATCHER ───────────────────────────────────────────────────────
nlp     = spacy.load("en_core_web_sm")
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

patterns = []
for term in SKILL_TERMS:
    t = term.lower().strip()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"(?i)([a-z])[-–—]([a-z])", r"\1 \2", t)
    patterns.append(nlp.make_doc(t))
matcher.add("SKILLS", patterns)

doc   = nlp(normalized)
found = {doc[start:end].text.lower() for _, start, end in matcher(doc)}
print(f"PhraseMatcher found {len(found)} skills:\n {found}\n")

# ─── 4) SAVE TO DJANGO ──────────────────────────────────────────────────────────
major, _ = Major.objects.get_or_create(name=MAJOR_NAME)
print(f"=== Importing into Major: {major.name} (id={major.id}) ===")

major.department  = department
major.description = description
major.save()

major.skills.clear()
for skill_name in sorted(found):
    skill, created = Skill.objects.get_or_create(name=skill_name)
    major.skills.add(skill)
    print(f"{'+' if created else '*'} {skill_name}")

print("✔ Done. Major.skills now exactly matches your PhraseMatcher hits.")
