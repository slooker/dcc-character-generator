"""Extract a Skill/Spell catalog from dcc-skills.pdf and dcc-spells.pdf.

Writes source-text/skill-catalog.json: each entry's name, book page, section
(e.g. "EDGED WEAPON SKILLS"), and the italic type line printed under its
heading (e.g. "Melee Attack, Str", "Charisma", "Attack, Fire, Intelligence").
Race/Class benefit choices ("a Weapon Skill of your choice", "a Fire Spell")
are resolved against this catalog.

Usage: python tools/extract_skill_catalog.py
"""
import json
import re
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
ENTRY_FONT = 'TextbookNew-Bold'
TYPE_FONT = 'TextbookNew-Italic'
SECTION_FONT = 'NeueKabel-Black'
CHAPTER_FONT = 'CitrusGothic'


def titlecase(name: str) -> str:
    small = {'and', 'or', 'of', 'the', 'on', 'your', 'in', 'a', 'to'}
    words = name.lower().split()
    return ' '.join(w if i and w in small else w[:1].upper() + w[1:] for i, w in enumerate(words))


def spans(doc):
    for page in doc:
        numbers = [s for s in page.get_text().split() if s.isdigit() and 170 <= int(s) <= 330]
        page_no = int(numbers[-1]) if numbers else None
        width = page.rect.width
        rows = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = ''.join(s['text'] for s in line['spans']).strip()
                if not text:
                    continue
                font = line['spans'][0]['font']
                size = round(max(s['size'] for s in line['spans']))
                column = 0 if line['bbox'][0] < width / 2 else 1
                rows.append((column, line['bbox'][1], font, size, text))
        rows.sort(key=lambda r: (r[0], r[1]))
        for _, _, font, size, text in rows:
            yield page_no, font, size, text


def extract(pdf_name: str, kind: str):
    doc = pymupdf.open(ROOT / 'source-files' / pdf_name)
    entries, section, pending, current, last_was_section = [], '', '', None, False
    for page_no, font, size, text in spans(doc):
        if (font.startswith(SECTION_FONT) and size == 20) or (font.startswith(CHAPTER_FONT) and size == 30):
            # Section headings can wrap onto two lines ("HAND-TO-HAND" / "COMBAT SKILLS");
            # sidebar headings such as "SMOKE" don't name a Skill section and are ignored.
            pending = f'{pending} {text}' if last_was_section else text
            if 'SKILL' in pending.upper():
                section = pending.upper()
            current, last_was_section = None, True
            continue
        last_was_section = False
        if font.startswith(ENTRY_FONT) and size == 12 and text.isupper():
            if 'EXAMPLE' in text or 'CREATING YOUR OWN' in section:
                current = None
                continue
            name = re.sub(r'\s*\(.*\)$', '', text)  # "ASTRAL PAW (ASTRAL HAND, ...)"
            current = {'kind': kind, 'name': titlecase(name), 'page': page_no, 'section': section, 'type': ''}
            entries.append(current)
        elif current is not None and font.startswith(TYPE_FONT) and size == 10 and len(current['type']) < 120:
            # The type line can wrap ("Attack, Necrotic, Charisma, Favored:" / "Cleric").
            if not current['type'] or current['type'].endswith((',', ':')):
                current['type'] = (current['type'] + ' ' + text).strip()
        elif current is not None and current['type']:
            current = None
    return entries


if __name__ == '__main__':
    data = extract('dcc-skills.pdf', 'skill') + extract('dcc-spells.pdf', 'spell')
    out = ROOT / 'source-text' / 'skill-catalog.json'
    out.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f'{len(data)} entries -> {out}')
