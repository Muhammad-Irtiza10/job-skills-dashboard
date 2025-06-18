# catalog/nlp.py

import re
import spacy
from bs4 import BeautifulSoup

nlp = spacy.load("en_core_web_sm")

# NER labels and blacklist as before
NER_LABELS = {"PRODUCT", "ORG", "LANGUAGE", "GPE", "NORP", "WORK_OF_ART"}
EXTENDED_BLACKLIST = {
    "microsoft","certified","learn","introduction","module",
    "experience","services","resources","candidate","responsibilities",
    "knowledge","solution","solutions","clients"
}
MIN_WORDS, MAX_WORDS = 1, 3
MIN_CHAR = 3

def extract_skills(text, products=None, subjects=None):
    # 1) Attempt structured seeds
    seeds = set()
    for p in (products or []):
        seeds.add(p.lower().strip())
    for s in (subjects or []):
        seeds.add(s.lower().strip())

    # Clean seeds
    seeds = {
        re.sub(r"[^\w\s-]","", s)
        for s in seeds
        if len(s)>=MIN_CHAR and not re.search(r"\d",s)
    }

    # 2) If we got any seeds, return them
    if seeds:
        return list(seeds)

    # 3) Otherwise, do hybrid NLP on the text
    if not text:
        return []

    # Strip HTML
    soup = BeautifulSoup(text, "html.parser")
    cleaned = re.sub(r"\s+"," ", soup.get_text()).strip()
    if not cleaned:
        return []

    doc = nlp(cleaned)
    skills = set()

    # NER
    for ent in doc.ents:
        if ent.label_ in NER_LABELS:
            skills.add(ent.text.lower().strip())

    # Noun chunks
    for chunk in doc.noun_chunks:
        phrase = chunk.text.lower().strip()
        words = phrase.split()
        if MIN_WORDS <= len(words) <= MAX_WORDS:
            skills.add(phrase)

    # Final filter
    final = []
    for phrase in skills:
        ph = re.sub(r"[^\w\s-]","", phrase).strip()
        if len(ph)<MIN_CHAR: 
            continue
        if any(b in ph for b in EXTENDED_BLACKLIST):
            continue
        if re.search(r"\d",ph):
            continue
        final.append(ph)

    return final
