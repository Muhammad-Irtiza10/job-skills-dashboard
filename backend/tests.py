#!/usr/bin/env python
"""
Usage:
  # Extract course codes from one or more catalog PDFs,
  # match against a master course description PDF,
  # infer skills via ML/NLP, and optionally save to Django.

  python backend/extract_catalog_skills.py \
      catalog1.pdf [catalog2.pdf ...] \
      --descriptions "Course Descriptions.pdf" \
      [--outdir code_lists] [--save] [--major-name "Custom Major"]

Arguments:
  catalogs             One or more catalog PDF files.
Options:
  --descriptions PATH  Path to the master Course Descriptions PDF.
  --outdir DIR         Directory to save extracted course-code .txt files (default: ./code_lists).
  --save               If passed, persist majors and skills to the Django database.
  --major-name NAME    Override the major name (otherwise use header line).
"""
import os
import re
import argparse
from pathlib import Path
import fitz  # PyMuPDF
import nltk
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from keybert import KeyBERT

# Initialize NLP once
er_model = pipeline(
    "ner",
    model="jjzha/jobbert_skill_extraction",
    aggregation_strategy="simple"
)
embedder = SentenceTransformer('all-MiniLM-L6-v2')
tf_model = KeyBERT(model='all-MiniLM-L6-v2')
nltk.download('stopwords', quiet=True)

# Extract raw text with whitespace normalization
def extract_text(path: Path) -> str:
    txt = ''
    with fitz.open(path) as doc:
        for page in doc:
            txt += page.get_text('text') + '\n'
    # collapse whitespace
    txt = re.sub(r"\s+", ' ', txt)
    # fix hyphens
    txt = re.sub(r"([a-z])[-–—]([a-z])", r"\1 \2", txt, flags=re.I)
    return txt

# Extract raw text, preserving newlines
def extract_text_preserve(path: Path) -> str:
    txt = ''
    with fitz.open(path) as doc:
        for page in doc:
            txt += page.get_text('text') + '\n'
    return txt

# Extract header lines: first page, y0 threshold
def extract_header_text(path: Path, y_thresh: float = 150.0) -> list[str]:
    blocks = []
    with fitz.open(path) as doc:
        first = doc[0]
        for blk in first.get_text('blocks'):
            x0,y0,_,_,txt = blk[:5]
            if y0 < y_thresh and not re.match(r'^\d+\s*\|\s*Page', txt.strip()):
                blocks.append((y0, txt.strip()))
    blocks.sort(key=lambda t: t[0])
    return [line for _, line in blocks]

# Parse header: line0=department, line1=major name, rest=description
def parse_header(lines: list[str], max_sents: int = 2):
    dept = lines[0] if len(lines) > 0 else ''
    major_name = lines[1] if len(lines) > 1 else ''
    desc = ''
    if len(lines) > 2:
        src = ' '.join(lines[2:])
        sents = re.split(r'(?<=[\.\?!])\s+', src)
        desc = ' '.join(sents[:max_sents]).strip()
        desc = re.sub(r"\s+", ' ', desc)
    return dept, major_name, desc

# Extract course codes pattern
def extract_course_codes(text: str) -> list[str]:
    pat = re.compile(r'\b[A-Z]{2,5}\s*\d{3}\b')
    return sorted({m.group().upper() for m in pat.finditer(text)})

# Build map course code -> description
def parse_descriptions(path: Path) -> dict[str, str]:
    raw = extract_text_preserve(path)
    regex = re.compile(
        r'^([A-Z]{2,5}\s*\d{3})\s+[^\(]+\([^\)]*\)\s*(.*?)\s*(?=^[A-Z]{2,5}\s*\d{3}\s+[^\(]+\([^\)]*\)|\Z)',
        re.MULTILINE | re.DOTALL
    )
    descs = {}
    for m in regex.finditer(raw):
        code = re.sub(r"\s+", ' ', m.group(1)).strip()
        txt = re.sub(r"\s+", ' ', m.group(2)).strip()
        descs[code] = txt
        descs[code.replace(' ', '')] = txt  # fallback no-space key
    return descs

# Infer skills using NER + keyphrase
def extract_skills(text: str) -> list[str]:
    skills = set()
    # NER model
    for ent in er_model(text):
        if ent.get('entity_group','').lower() == 'skill':
            skills.add(ent['word'].lower())
    # KeyBERT phrases
    for phrase, _ in tf_model.extract_keywords(text, keyphrase_ngram_range=(1,2), top_n=20):
        skills.add(phrase.lower())
    return sorted(skills)

# Main CLI
def main():
    p = argparse.ArgumentParser(
        description="Extract codes, infer skills, optional Django save"
    )
    p.add_argument('catalogs', nargs='+', type=Path, help='Catalog PDF(s)')
    p.add_argument('--descriptions', '-d', required=True, type=Path,
                   help='Course Descriptions PDF')
    p.add_argument('--outdir', '-o', type=Path, default=Path('code_lists'),
                   help='Directory to write code .txt files')
    p.add_argument('--save', action='store_true', help='Save to Django DB')
    p.add_argument('--major-name', help='Override major name')
    args = p.parse_args()

    args.outdir.mkdir(parents=True, exist_ok=True)
    desc_map = parse_descriptions(args.descriptions)

    if args.save:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE','skillgap_project.settings')
        import django; django.setup()
        from catalog.models import Major, Skill

    for catalog in args.catalogs:
        if not catalog.exists():
            print(f"❌ Catalog not found: {catalog}")
            continue
        # Header parsing once
        hdr = extract_header_text(catalog)
        dept, hdr_major, maj_desc = parse_header(hdr)
        major_name = args.major_name or hdr_major or catalog.stem
        print(f"Department: {dept}\nMajor: {major_name}\nDescription: {maj_desc}\n")

        # Extract and save codes
        codes = extract_course_codes(extract_text(catalog))
        code_file = args.outdir / f"{catalog.stem}.txt"
        code_file.write_text("\n".join(codes), encoding='utf-8')
        print(f"📝  {len(codes)} codes → {code_file}")

        all_skills = set()
        # Iterate each course
        for code in codes:
            desc = desc_map.get(code) or desc_map.get(code.replace(' ',''))
            if not desc:
                print(f"⚠️  No description for course {code}")
                continue
            skills = extract_skills(desc)
            all_skills.update(skills)
            print(f"Course {code}: {', '.join(skills) if skills else 'No skills found'}")

        # Save to DB if requested
        if args.save:
            mj, _ = Major.objects.get_or_create(name=major_name)
            mj.department = dept; mj.description = maj_desc; mj.save()
            mj.skills.clear()
            for sk in sorted(all_skills):
                s, _ = Skill.objects.get_or_create(name=sk)
                mj.skills.add(s)
            print(f"💾 Saved {len(all_skills)} skills under {major_name}\n")

if __name__ == '__main__':
    main()
