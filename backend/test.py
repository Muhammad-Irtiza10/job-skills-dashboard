#!/usr/bin/env python
"""
Usage:
  # 1) Extract course codes from catalog(s):
  python backend/test.py \
      catalog1.pdf [catalog2.pdf ...] \
      --descriptions "Course Descriptions.pdf" \
      [--outdir code_lists]

  # 2) Curate code_lists/<catalog>.txt manually (one skill per line).

  # 3) Persist to DB:
  python backend/test.py \
      --descriptions "Course Descriptions.pdf" \
      --outdir code_lists \
      --save \
      --settings-module your_project.settings \
      --major-name "Major Name" \
      --skills-file code_lists/<catalog>.txt \
      catalog.pdf

Arguments:
  catalogs               Catalog PDF path(s), specified last.
Options:
  --descriptions PATH    Path to the master Course Descriptions PDF.
  --outdir DIR           Dir for course-code .txt files (default: ./code_lists).
  --save                 Persist major & skills to Django DB.
  --settings-module PATH Python path to Django settings module (e.g. myproj.settings).
  --major-name NAME      Override major name (else uses header line).
  --skills-file PATH     Curated skills file (.txt); if given, skips NLP inference.
"""
import os
import sys
import re
import argparse
from pathlib import Path
import fitz  # PyMuPDF
import nltk
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from keybert import KeyBERT

# Ensure project root on PYTHONPATH for Django settings
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

# Initialize NLP models
er_model = pipeline(
    "ner",
    model="jjzha/jobbert_skill_extraction",
    aggregation_strategy="simple"
)
embedder = SentenceTransformer('all-MiniLM-L6-v2')
tf_model = KeyBERT(model='all-MiniLM-L6-v2')
nltk.download('stopwords', quiet=True)

# Text extraction utilities
def extract_text(path: Path) -> str:
    txt = ''
    with fitz.open(path) as doc:
        for page in doc:
            txt += page.get_text('text') + '\n'
    txt = re.sub(r"\s+", ' ', txt)
    txt = re.sub(r"([a-z])[-–—]([a-z])", r"\1 \2", txt, flags=re.I)
    return txt

def extract_text_preserve(path: Path) -> str:
    txt = ''
    with fitz.open(path) as doc:
        for page in doc:
            txt += page.get_text('text') + '\n'
    return txt

# Header parsing
def extract_header_text(path: Path, y_thresh: float=150.0) -> list[str]:
    blocks = []
    with fitz.open(path) as doc:
        for blk in doc[0].get_text('blocks'):
            x0, y0, _, _, txt = blk[:5]
            if y0 < y_thresh and not re.match(r'^\d+\s*\|\s*Page', txt.strip()):
                blocks.append((y0, txt.strip()))
    blocks.sort(key=lambda t: t[0])
    return [line for _, line in blocks]

def parse_header(lines: list[str], max_sents: int=2):
    dept = lines[0] if len(lines) > 0 else ''
    maj_line = lines[1] if len(lines) > 1 else ''
    desc = ''
    if len(lines) > 2:
        src = ' '.join(lines[2:])
        sents = re.split(r'(?<=[\.\?!])\s+', src)
        desc = ' '.join(sents[:max_sents]).strip()
        desc = re.sub(r"\s+", ' ', desc)
    return dept, maj_line, desc

# Extract course codes
def extract_course_codes(text: str) -> list[str]:
    pat = re.compile(r'\b[A-Z]{2,5}\s*\d{3}\b')
    return sorted({m.group().upper() for m in pat.finditer(text)})

# Build descriptions map
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
        descs[code.replace(' ', '')] = txt
    return descs

# NLP-based skill inference
def infer_skills(text: str) -> set[str]:
    skills = set()
    for ent in er_model(text):
        if ent.get('entity_group','').lower() == 'skill':
            skills.add(ent['word'].lower())
    for phrase, _ in tf_model.extract_keywords(text, keyphrase_ngram_range=(1,2), top_n=20):
        skills.add(phrase.lower())
    return skills

# Main function
def main():
    parser = argparse.ArgumentParser(description="Extract codes and link skills to DB")
    parser.add_argument('catalogs', nargs='+', type=Path, help='Catalog PDF(s) (last position)')
    parser.add_argument('--descriptions', '-d', required=True, type=Path,
                        help='Path to the Course Descriptions PDF')
    parser.add_argument('--outdir', '-o', type=Path, default=Path('code_lists'),
                        help='Directory for course-code .txt files')
    parser.add_argument('--save', action='store_true', help='Persist to Django DB')
    parser.add_argument('--settings-module', type=str,
                        help='Django settings module, e.g. myproj.settings')
    parser.add_argument('--major-name', type=str, help='Override major name')
    parser.add_argument('--skills-file', '-s', type=Path,
                        help='Path to curated skills .txt (one per line)')
    args = parser.parse_args()

    args.outdir.mkdir(parents=True, exist_ok=True)
    desc_map = parse_descriptions(args.descriptions)

    if args.save:
        settings_mod = args.settings_module or os.environ.get('DJANGO_SETTINGS_MODULE') or 'skillgap_project.settings'
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_mod)
        try:
            import django; django.setup()
        except ModuleNotFoundError:
            sys.exit(f"❌  Settings module '{settings_mod}' not found. Use --settings-module or set DJANGO_SETTINGS_MODULE.")
        from catalog.models import Major, Skill

    for catalog in args.catalogs:
        if not catalog.exists():
            print(f"❌ Catalog not found: {catalog}")
            continue

        # Header
        hdr = extract_header_text(catalog)
        dept, maj_line, maj_desc = parse_header(hdr)
        major_name = args.major_name or maj_line or catalog.stem
        print(f"Department: {dept}\nMajor: {major_name}\nDescription: {maj_desc}\n")

        # Course codes
        codes = extract_course_codes(extract_text(catalog))
        code_file = args.outdir / f"{catalog.stem}.txt"
        # Skip overwriting if using the same skills file
        if not (args.skills_file and args.skills_file.exists() and args.skills_file.resolve() == code_file.resolve()):
            code_file.write_text("\n".join(codes), encoding='utf-8')
            print(f"📝  {len(codes)} codes → {code_file}")
        else:
            print(f"📝  Skipping code list overwrite; using curated {code_file}")

        # Skills
        if args.skills_file and args.skills_file.exists() and args.skills_file.resolve() == code_file.resolve():
            all_skills = {
                line.strip().lower()
                for line in args.skills_file.read_text(encoding='utf-8').splitlines()
                if line.strip()
            }
            print(f"✅ Loaded {len(all_skills)} curated skills from {args.skills_file}\n")
        else:
            all_skills = set()
            for code in codes:
                desc = desc_map.get(code) or desc_map.get(code.replace(' ', ''))
                if not desc:
                    print(f"⚠️  No description for course {code}")
                    continue
                sk = infer_skills(desc)
                all_skills.update(sk)
                print(f"Course {code}: {', '.join(sorted(sk)) if sk else 'No skills found'}")

        # Persist
        if args.save:
            mj, _ = Major.objects.get_or_create(name=major_name)
            mj.department = dept; mj.description = maj_desc; mj.save()
            mj.skills.clear()
            for sk in sorted(all_skills):
                skill_obj, _ = Skill.objects.get_or_create(name=sk)
                mj.skills.add(skill_obj)
            print(f"💾 Saved {len(all_skills)} skills under '{major_name}'\n")

if __name__ == '__main__':
    main()
