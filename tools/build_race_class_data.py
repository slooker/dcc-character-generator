"""Build dist/races-classes.js from source-text/races-classes.json.

Run tools/extract_races_classes.py first. Prerequisites are encoded by hand
below from the printed text (dcc-races.pdf pp. 128-141, dcc-classes.pdf
pp. 142-158); the build fails if any entry with prerequisite or restriction
text has no encoding, so nothing in the book is silently dropped.

Requirement types (evaluated by raceClassRequirementIssues in rules.js):
  skillRank       any of `skills` at Rank `min`+
  skillStatRank   any Skill using one of `stats` at Rank `min`+
  animalSpecies   crawler is an animal of `species`
  race            chosen Race is one of `races`
  earthRace       chosen Race is an Earth Race (Earth Classes, p. 142)
  popularity      Popularity `min`+
  achievement     crawler has earned achievement `name`
  female          crawler is female (optional limit, p. 128 sidebar)
  noClub          crawler does not have access to `club`
  worshipAllowed  chosen Race can worship a deity
"""
import json
import re
from pathlib import Path

from race_class_effects import Catalog, catalog_export, parse_bullet

ROOT = Path(__file__).resolve().parent.parent
EDGED_WEAPONS = ['Axe', 'Dagger', 'Longsword', 'Rapier']  # dcc-skills.pdf, Edged Weapon Skills
TRAP_SKILLS = ['Detect Trap', 'Find Trap', 'Trap Engineer']
CAT_RACES = ['Cat', 'Cat Girl/Cat Boy', 'Tigran']

RACE_REQUIREMENTS = {
    'Amazonian': [{'type': 'skillStatRank', 'stats': ['Str', 'Dex'], 'min': 5}],
    'Cat': [{'type': 'animalSpecies', 'species': 'Cat'}],
    'Obsidian Butterfly': [{'type': 'skillRank', 'skills': EDGED_WEAPONS, 'min': 5}],
    'Sasquatch': [{'type': 'skillRank', 'skills': ['Smush'], 'min': 5}],
    'Bune': [{'type': 'popularity', 'min': 3}],
    'Grulke': [{'type': 'skillRank', 'skills': ['Jumping', 'Light on Your Feet'], 'min': 5}],
    'Hobgoblin': [
        {'type': 'skillRank', 'skills': ['Explosives Handling'], 'min': 5},
        {'type': 'skillRank', 'skills': TRAP_SKILLS, 'min': 5},
    ],
}

NO_DESPERADO = {'type': 'noClub', 'club': 'Desperado Club'}
NO_VANQUISHER = {'type': 'noClub', 'club': 'Club Vanquisher'}
WORSHIP = {'type': 'worshipAllowed'}

CLASS_REQUIREMENTS = {
    'Feral Cat Berserker': [{'type': 'race', 'races': CAT_RACES}],
    'Shieldmaiden': [{'type': 'female'}],
    'Former Child Actor': [{'type': 'popularity', 'min': 3}],
    'Monster Truck Driver': [{'type': 'skillRank', 'skills': ['Driving'], 'min': 5}],
    'Prizefighter': [{'type': 'skillRank', 'skills': ['Pugilism'], 'min': 5}],
    'Bomb Squad Tech': [{'type': 'achievement', 'name': 'Boom!'}],
    'Compensated Anarchist': [
        {'type': 'popularity', 'min': 3},
        {'type': 'skillRank', 'skills': ['Explosives Handling'], 'min': 5},
    ],
    'Boring Ol’ Cleric': [WORSHIP, NO_DESPERADO],
    'Black Inquisitor General': [WORSHIP],
    'Santero': [WORSHIP, NO_DESPERADO],
    'Boring Ol’ Paladin': [WORSHIP, NO_DESPERADO],
    'Cavalier': [WORSHIP],
    'Sacred Paladin': [WORSHIP, NO_DESPERADO],
    'Boring Ol’ Rogue': [NO_VANQUISHER],
    'High Rise Grifter': [NO_VANQUISHER],
    'Identity Thief': [NO_VANQUISHER],
}

# Headings printed with a typo in the PDF.
NAME_FIXES = {'PHysicker': 'Physicker'}

RESTRICTION = re.compile(r'(?i)cannot choose|must worship')


def build_entry(entry, requirements, catalog):
    requires = list(requirements.get(entry['name'], []))
    if entry['kind'] == 'class' and entry['earth']:
        requires.insert(0, {'type': 'earthRace'})
    out = {
        'name': NAME_FIXES.get(entry['name'], entry['name']),
        'page': entry['page'],
        'earth': entry['earth'],
        'requires': requires,
        'prerequisite': entry['prerequisite'],
        'description': entry.get('description', ''),
        'benefits': entry['benefits'],
        # One list of effects per benefit bullet; [] means reference text only.
        'effects': [parse_bullet(b, catalog) for b in entry['benefits']],
    }
    if entry['kind'] == 'class':
        out['classTypes'] = [t.strip() for t in entry['classType'].split(',') if t.strip()]
    else:
        out['cannotWorship'] = any(b.lower().startswith('cannot worship') for b in entry['benefits'])
    return out


def check_coverage(entries, requirements):
    names = {e['name'] for e in entries}
    unknown = set(requirements) - names
    if unknown:
        raise SystemExit(f'Requirements for unknown entries: {sorted(unknown)}')
    for e in entries:
        restricted = e['prerequisite'] or any(RESTRICTION.search(b) for b in e['benefits'])
        if restricted and e['name'] not in requirements:
            raise SystemExit(f"{e['name']} has prerequisite/restriction text but no encoded requirements")


def main():
    data = json.loads((ROOT / 'source-text' / 'races-classes.json').read_text(encoding='utf-8'))
    check_coverage(data['races'], RACE_REQUIREMENTS)
    check_coverage(data['classes'], CLASS_REQUIREMENTS)
    if not data['classes'][0]['classType']:
        raise SystemExit('Class Types failed to extract')
    catalog_entries = json.loads((ROOT / 'source-text' / 'skill-catalog.json').read_text(encoding='utf-8'))
    catalog = Catalog(catalog_entries)
    races = [build_entry(e, RACE_REQUIREMENTS, catalog) for e in data['races']]
    classes = [build_entry(e, CLASS_REQUIREMENTS, catalog) for e in data['classes']]
    header = ('// Generated by tools/build_race_class_data.py from dcc-races.pdf (pp. 128-141),\n'
              '// dcc-classes.pdf (pp. 142-158), dcc-skills.pdf and dcc-spells.pdf. Do not edit by hand;\n'
              '// rerun tools/extract_races_classes.py, tools/extract_skill_catalog.py, then this script.\n')
    compact = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    body = (f'export const races = {compact(races)};\n\n'
            f'export const classes = {compact(classes)};\n\n'
            f'export const skillCatalog = {compact(catalog_export(catalog_entries))};\n')
    (ROOT / 'dist' / 'races-classes.js').write_text(header + body, encoding='utf-8')
    print(f'{len(races)} races, {len(classes)} classes -> dist/races-classes.js')


if __name__ == '__main__':
    main()
