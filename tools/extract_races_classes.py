"""Extract Race and Class entries from dcc-races.pdf / dcc-classes.pdf.

Writes source-text/races-classes.json: name, book page, Earth marble flag,
Class Type, prerequisite text, description (the text between the heading and
the first benefit bullet) and benefit bullets for each entry. The Earth flag comes from the small vector "marble" icon
drawn after an entry's heading, which plain text extraction drops.

Usage: python tools/extract_races_classes.py
"""
import json
import re
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
HEADING_FONT = 'CitrusGothic'
STOP_HEADINGS = {'Step One: Imagining the Race or Class'}


CLASS_TYPES = ('Arcanist', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Mage', 'Monk', 'Paladin', 'Rogue')
TYPES = '|'.join(CLASS_TYPES)


def is_artifact(text: str, page_no) -> bool:
    """Page furniture: chapter tab digits, running header, folio, copyright."""
    s = text.strip()
    return (s in {'1', '3', str(page_no)} or 'CHAPTER 3: CHARACTER CREATION' in s
            or s.startswith('Copyright Renegade Game Studios'))


def clean(text: str) -> str:
    text = re.sub(r'\s+', ' ', text).strip()
    # Hyphenation and kerning artifacts like "Str ength" come from the PDF's
    # letter spacing; pymupdf keeps words intact, so only tidy whitespace.
    return text.replace(' ,', ',')


def book_page(page) -> int | None:
    numbers = [s for s in page.get_text().split() if s.isdigit() and 90 <= int(s) <= 330]
    return int(numbers[-1]) if numbers else None


def has_marble(page, bbox) -> bool:
    x0, y0, x1, y1 = bbox
    for drawing in page.get_drawings():
        r = drawing['rect']
        if 4 < r.width < 20 and r.height < 20 and x1 - 25 <= r.x0 < x1 + 30 and r.y0 < y1 + 4 and r.y1 > y0 - 4:
            return True
    return False


def lines_in_reading_order(page):
    """Yield (kind, text, bbox) for each text line, column by column."""
    width = page.rect.width
    out = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = [s for s in line['spans'] if s['text'].strip()]
            if not spans:
                continue
            text = ''.join(s['text'] for s in spans)
            heading = any(HEADING_FONT in s['font'] and 12 < s['size'] < 14 for s in spans)
            column = 0 if line['bbox'][0] < width / 2 else 1
            out.append((column, line['bbox'][1], 'heading' if heading else 'text', text, line['bbox']))
    out.sort(key=lambda x: (x[0], x[1]))
    return [(kind, text, bbox) for _, _, kind, text, bbox in out]


# Words broken at a line end keep a plain hyphen ("blockbust- er"); a suffix
# after it means the word was split, anything else is a real hyphen ("most-loved").
SPLIT_WORD = re.compile(r'(\w)- (ing|ings|er|ers|ed|ly|tion|tions|ment|ments|ness|able|ible|al|ous)\b')


def description(intro: str, has_prerequisite: bool) -> str:
    """The entry's text before its benefit bullets, without the Class Type and
    Prerequisite lines or a closing "receive the following benefits:"."""
    intro = re.sub(r'Class Types?:\s*[A-Z][\w-]*(?:\s*(?:,|and)\s*[A-Z][\w-]*)*', '', intro)
    if has_prerequisite:
        intro = re.sub(r'Prerequisites?:\s*[^•]*', '', intro)
    intro = SPLIT_WORD.sub(r'\1\2', clean(intro))
    intro = re.sub(r'(\w)- (\w)', r'\1-\2', intro)
    return re.sub(r'\s*[^.!?]*\breceives? the following benefits:$', '', intro).strip()


def extract(pdf_name: str, kind: str):
    doc = pymupdf.open(ROOT / 'source-files' / pdf_name)
    entries, current, stopped = [], None, False
    for page in doc:
        page_no = book_page(page)
        for line_kind, text, bbox in lines_in_reading_order(page):
            if stopped:
                break
            if line_kind == 'heading':
                name = clean(text)
                if name in STOP_HEADINGS:
                    stopped = True
                    break
                if not name:
                    continue
                current = {'kind': kind, 'name': name, 'page': page_no, 'earth': has_marble(page, bbox),
                           'classType': '', 'prerequisite': '', 'raw': []}
                entries.append(current)
            elif current is not None and not is_artifact(text, page_no):
                current['raw'].append(text)
    for entry in entries:
        body = clean(' '.join(entry.pop('raw')))
        match = re.search(r'Class Types?:\s*((?:%s)(?:\s*(?:,|and)\s*(?:%s))*)' % (TYPES, TYPES), body)
        if match:
            entry['classType'] = ', '.join(re.findall(TYPES, match.group(1)))
        prereq = re.search(r'Prerequisites?:\s*([^•]+)', body)
        if prereq:
            entry['prerequisite'] = clean(prereq.group(1))
        entry['description'] = description(body.split('•')[0], bool(entry['prerequisite']))
        bullets = [clean(b) for b in body.split('•')[1:] if clean(b)]
        if bullets:
            # Sidebars and the next section's intro follow the final bullet;
            # they start with an all-caps heading.
            bullets[-1] = re.split(r'\s(?=[A-Z][A-Z’\'&:,\- ]{2,}[A-Z]\s[A-Z])', bullets[-1])[0]
        entry['benefits'] = bullets
    return [e for e in entries if e['benefits']]


if __name__ == '__main__':
    data = {'races': extract('dcc-races.pdf', 'race'), 'classes': extract('dcc-classes.pdf', 'class')}
    out = ROOT / 'source-text' / 'races-classes.json'
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"{len(data['races'])} races, {len(data['classes'])} classes -> {out}")
