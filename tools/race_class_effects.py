"""Turn Race/Class benefit bullets into structured effects for rules.js.

Each bullet maps to zero or more effects; bullets with no effects stay as
reference text on the sheet. Effect types:
  stat        {stats: {Str: 3, ...}}                  Unenhanced Stat change
  statSplit   {total, stats: [...]}                   player splits `total` points
  statCap     {stat, max}                             Stat can't exceed `max`
  size        {value}                                 e.g. "Medium (4)"
  dr          {value, buff}                           DR (always shown as a Buff)
  move        {value}                                 +ft Move
  skill       {bonus, skills: [...]}                  named Skill/Spell Ranks
  skillPick   {bonus, count, options: [...]}          player picks `count` of `options`
  dayNight    {day: {add?, multiply?}, night: {...}}   time-of-day Stat changes (Lajabless);
                                                      the sheet shows "day/night" values
  rankLimit   {max, skills: [...] | all: true}        listed Skills can be raised to Rank `max`
  rankLimitPick {max, count, options: [...]}          player picks Skills that can reach `max`
  skillGroup  {bonus, skills: [...], min?}            Ranks to every listed Skill (granted if new);
                                                      with `min`, only Skills the crawler has

Skill/Spell bonuses add Ranks immediately; a Skill the crawler lacks is gained
at the bonus Rank; totals cap at Rank 10 during selection (p. 128; user ruling).
"""
import re

STATS = {'Strength': 'Str', 'Intelligence': 'Int', 'Constitution': 'Con', 'Dexterity': 'Dex', 'Charisma': 'Cha'}
STAT_RE = '(?:' + '|'.join(STATS) + ')'
# User ruling: skills whose own entry is a crafting Skill (See Crafting, p. 221), plus Calligraphy.
CRAFTING = ['Alchemy', 'Calligraphy', 'Engineering', 'Fabricate', 'Gear Head', 'Improvised Explosive Device',
            'Infusion', 'Salvage', 'Smithing', 'Tattoo Artistry', 'Trap Engineer']
EXPLOSIVE = ['Explosives Handling', 'Goblin Explosives', 'Improvised Explosive Device', 'Incendiary Device Handling']
TRAP = ['Detect Trap', 'Find Trap', 'Trap Engineer']
# User ruling for Shotgun Messenger's "muscle-powered movement-related Skills" (p. 151).
MOVEMENT = ['Climbing', 'Jumping', 'Running', 'Swimming']
WEAPON_SECTIONS = {'BASHING WEAPON SKILLS', 'EDGED WEAPON SKILLS', 'RANGED WEAPON SKILLS', 'REACH WEAPON SKILLS'}
# "Arcanist Skill" (Douchy Wizard School Wand-Maker) names no Skill; treated as Arcane.
ALIASES = {'intimidation': 'Intimidate', 'smite': 'Paladin’s Smite', 'arcanist': 'Arcane'}
# Custom Skills printed inside a Race entry, with the catalog Skill they use.
CUSTOM_SKILLS = {'Creepy Chains (Club)': 'Club'}


def signed(text: str) -> int:
    return int(text.replace('−', '-').replace('+', ''))


def split_names(text: str) -> list[str]:
    text = text.replace('Rise, Dead Minion!', 'Rise\x00 Dead Minion!')
    text = re.sub(r'\s*\((?!Club\))[^)]*\)', '', text)  # "(with a stringed instrument specialty)"
    parts = re.split(r',\s*(?:and\s+|or\s+)?|\s+and\s+', text)
    return [p.strip().replace('\x00', ',') for p in parts if p.strip()]


def stat_list(text: str) -> list[str]:
    return [STATS[s] for s in re.findall(STAT_RE, text)]


class Catalog:
    def __init__(self, entries):
        self.entries = entries
        self.by_name = {e['name'].lower(): e for e in entries}

    def resolve(self, name: str) -> str:
        if name in CUSTOM_SKILLS:
            return name
        key = ALIASES.get(name.lower(), name).lower()
        if key not in self.by_name:
            raise KeyError(name)
        return self.by_name[key]['name']

    def names(self, predicate) -> list[str]:
        return [e['name'] for e in self.entries if predicate(e)]

    def weapons(self, kind: str = '') -> list[str]:
        sections = {
            '': WEAPON_SECTIONS, 'Edged': {'EDGED WEAPON SKILLS'}, 'Reach': {'REACH WEAPON SKILLS'},
            'Ranged': {'RANGED WEAPON SKILLS'},
        }
        if kind == 'Melee':
            return self.names(lambda e: e['section'] in WEAPON_SECTIONS and e['type'].startswith('Melee'))
        return self.names(lambda e: e['section'] in sections[kind])

    def spells(self, keyword: str = '') -> list[str]:
        return self.names(lambda e: e['kind'] == 'spell' and (not keyword or keyword in e['type'].split(', ')))

    def stat_based(self, stat: str) -> list[str]:
        long = next(k for k, v in STATS.items() if v == stat)
        return self.names(lambda e: e['kind'] == 'skill' and (
            e['type'].split(',')[0] == long or e['type'].endswith(f', {stat}')))


def category_options(catalog: Catalog, category: str) -> list[str]:
    category = category.strip()
    if category == 'crafting':
        return CRAFTING
    match = re.fullmatch(r'(Edged |Reach |Ranged |Melee )?Weapon', category)
    if match:
        return catalog.weapons((match.group(1) or '').strip())
    match = re.fullmatch(r'(\w+ )?Spell', category)
    if match:
        return catalog.spells((match.group(1) or '').strip())
    raise KeyError(f'category {category!r}')


COUNT = {'a': 1, 'an': 1, 'one': 1, 'two': 2, 'two different': 2}


def rank_limit(subject: str, limit: int, catalog: Catalog) -> list[dict]:
    """'Smush Skill can be raised to Rank 20' and its variants (pp. 128-158)."""
    groups = {
        'All': None,  # Primal: "All Skills can be raised to Rank 20"
        'All crafting': CRAFTING,
        'All explosives and trap-making': EXPLOSIVE + ['Trap Engineer'],
    }
    if subject in groups:
        names = groups[subject]
        return [{'type': 'rankLimit', 'max': limit, 'all': True} if names is None
                else {'type': 'rankLimit', 'max': limit, 'skills': names}]
    picks = {
        'One Weapon': (1, lambda: catalog.weapons()),
        'Two different Charisma-based': (2, lambda: catalog.stat_based('Cha')),
        'Rapier or Longsword': (1, lambda: ['Rapier', 'Longsword']),
    }
    if subject in picks:
        count, options = picks[subject]
        return [{'type': 'rankLimitPick', 'max': limit, 'count': count, 'options': options()}]
    m = re.fullmatch(r'(.+?) and one crafting(?: Skill of your choice)?', subject)
    if m:
        return [{'type': 'rankLimit', 'max': limit, 'skills': [catalog.resolve(m.group(1))]},
                {'type': 'rankLimitPick', 'max': limit, 'count': 1, 'options': CRAFTING}]
    return [{'type': 'rankLimit', 'max': limit, 'skills': [catalog.resolve(n) for n in split_names(subject)]}]


# Lajabless (p. 136). User ruling: show Stats as "day/night" on the sheet.
DAY_NIGHT = {
    '+5 Intelligence during the day, +5 Strength during the night':
        {'day': {'add': {'Int': 5}}, 'night': {'add': {'Str': 5}}},
    'During the day, Strength is halved, but Spells cost half the Mana to cast':
        {'day': {'multiply': {'Str': 0.5}}, 'night': {}},
    'During the night, Strength is doubled, but Spells cost double the Mana to cast':
        {'day': {}, 'night': {'multiply': {'Str': 2}}},
}


def parse_bullet(text: str, catalog: Catalog) -> list[dict]:
    t = text.strip().rstrip('.')
    if t in DAY_NIGHT:
        return [{'type': 'dayNight', **DAY_NIGHT[t]}]
    m = re.fullmatch(r'(.+?) (?:Skills? |Spell )?can be raised to Rank (\d+)', t)
    if m:
        return rank_limit(m.group(1), int(m.group(2)), catalog)

    # Situational bonuses stay as sheet text.
    if re.search(r'Popularity (each time|when)|Buff for all of your Skill Checks', t):
        return []
    m = re.match(r'^Size\s*:\s*(?:Typically\s+)?(\w+ \(\d+\))', t)
    if m:
        return [{'type': 'size', 'value': m.group(1)}]
    if t.startswith('Size'):
        return []
    m = re.fullmatch(r'([+−-]\d+) to all Stats', t)
    if m:
        return [{'type': 'stat', 'stats': {s: signed(m.group(1)) for s in STATS.values()}}]
    m = re.fullmatch(rf'\+(\d+) (?:to )?split (?:as you please )?between ({STAT_RE}.*)', t)
    if m:
        return [{'type': 'statSplit', 'total': int(m.group(1)), 'stats': stat_list(m.group(2))}]
    m = re.fullmatch(rf'([+−-]\d+) ({STAT_RE})\. \2 is capped at (\d+)', t)
    if m:
        stat = STATS[m.group(2)]
        return [{'type': 'stat', 'stats': {stat: signed(m.group(1))}}, {'type': 'statCap', 'stat': stat, 'max': int(m.group(3))}]
    m = re.fullmatch(rf'([+−-]\d+) (?:to )?({STAT_RE}(?:(?:,| and|, and) {STAT_RE})*)(?: \(.*\))?', t)
    if m:
        return [{'type': 'stat', 'stats': {s: signed(m.group(1)) for s in stat_list(m.group(2))}}]
    m = re.fullmatch(r'\+(\d+) DR( Buff)?', t)
    if m:
        return [{'type': 'dr', 'value': int(m.group(1)), 'buff': bool(m.group(2))}]
    m = re.fullmatch(r'\+(\d+)ft Move', t)
    if m:
        return [{'type': 'move', 'value': int(m.group(1))}]

    # Groups: Ranks to matching Skills the crawler has.
    m = re.fullmatch(r'([+−-]\d+) Ranks in all (Strength|Dexterity) Skills \(to a minimum of 1 Rank if you have any Ranks\)', t)
    if m:
        return [{'type': 'skillGroup', 'bonus': signed(m.group(1)), 'min': 1,
                 'skills': catalog.stat_based(STATS[m.group(2)]) + catalog.names(
                     lambda e: e['section'] in WEAPON_SECTIONS | {'HAND-TO-HAND COMBAT SKILLS', 'ANIMAL CRAWLER & PET STRIKE SKILLS'}
                     and e['type'].endswith(', ' + STATS[m.group(2)]))}]
    groups = {
        'all Edged Weapon Skills': lambda: catalog.weapons('Edged'),
        'Dexterity-based Weapon Skills': lambda: catalog.names(lambda e: e['section'] in WEAPON_SECTIONS and e['type'].endswith(', Dex')),
        'all Charisma-based Skills': lambda: catalog.stat_based('Cha'),
        'all Explosive-based Skills': lambda: EXPLOSIVE,
        'all muscle-powered movement-related Skills': lambda: MOVEMENT,
        'all Trap-based and Explosive-based Skills': lambda: TRAP + EXPLOSIVE,
        'all Spells with the Heal keyword': lambda: catalog.spells('Heal'),
        'all Spells with the Electric, Fire, and Ice damage types':
            lambda: catalog.spells('Electric') + catalog.spells('Fire') + catalog.spells('Ice'),
    }
    m = re.fullmatch(r'\+(\d+) (?:Rank )?in (.+)', t)
    if m and m.group(2) in groups:
        return [{'type': 'skillGroup', 'bonus': int(m.group(1)), 'skills': groups[m.group(2)]()}]

    # Player picks.
    m = re.fullmatch(r'\+(\d+) to your choice of (one|two) of the following Skills: (.+?)(?: Skills)?', t)
    if m:
        return [{'type': 'skillPick', 'bonus': int(m.group(1)), 'count': COUNT[m.group(2)],
                 'options': [catalog.resolve(n) for n in split_names(m.group(3))]}]
    m = re.fullmatch(r'\+(\d+) (?:in either )?([\w’\' -]+?) or ([\w’\' -]+?) Skills?', t)
    if m:
        return [{'type': 'skillPick', 'bonus': int(m.group(1)), 'count': 1,
                 'options': [catalog.resolve(m.group(2)), catalog.resolve(m.group(3))]}]
    m = re.fullmatch(r'\+(\d+) in one (\w+) Spell and one (\w+) Spell', t)
    if m:
        bonus = int(m.group(1))
        return [{'type': 'skillPick', 'bonus': bonus, 'count': 1, 'options': catalog.spells(m.group(k))} for k in (2, 3)]
    m = re.fullmatch(r'\+(\d+) (.+?) and (?:a|an|one) (.+?) (?:Skill|Spell) of your choice', t)
    if m:
        return [{'type': 'skill', 'bonus': int(m.group(1)), 'skills': [catalog.resolve(m.group(2))]},
                {'type': 'skillPick', 'bonus': int(m.group(1)), 'count': 1, 'options': category_options(catalog, m.group(3))}]
    m = re.fullmatch(r'\+(\d+) in (two different|two|an|a|one) (?:(.+?) )?(Skills?|Spells?) of your choice', t)
    if m:
        noun = 'Spell' if m.group(4).startswith('Spell') else ''
        category = ' '.join(x for x in (m.group(3), noun) if x) or 'Spell'
        return [{'type': 'skillPick', 'bonus': int(m.group(1)), 'count': COUNT[m.group(2)],
                 'options': category_options(catalog, category)}]
    m = re.fullmatch(r'\+(\d+) in (two|two different) (\w+) Spells', t)
    if m:
        return [{'type': 'skillPick', 'bonus': int(m.group(1)), 'count': 2, 'options': catalog.spells(m.group(3))}]
    m = re.fullmatch(r'\+(\d+) in an? (\w+ )?(Fire|Ranged Weapon) (?:Spell|Skill)', t)
    if m:
        category = 'Fire Spell' if m.group(3) == 'Fire' else 'Ranged Weapon'
        return [{'type': 'skillPick', 'bonus': int(m.group(1)), 'count': 1, 'options': category_options(catalog, category)}]

    # Named Skills/Spells, with trailing notes after a comma ("…, which costs half…").
    m = re.fullmatch(r'([+−-]\d+) (?:in )?(.+?)(?: (?:Skills?|Spells?))?(?:,? (?:with|which|and you)\b.*)?', t)
    if m and not re.search(r'Popularity|Buff for|Rank in all|in all ', m.group(2)):
        skills = [catalog.resolve(n) for n in split_names(m.group(2))]
        return [{'type': 'skill', 'bonus': signed(m.group(1)), 'skills': skills}]
    return []


def catalog_export(entries) -> list[dict]:
    """Compact Skill/Spell catalog for the browser: name, kind, section, stat, page."""
    out = []
    for e in entries:
        first = e['type'].split(',')[0].strip()
        if e['kind'] == 'spell':
            named = [STATS[s] for s in STATS if s in e['type'].split(', ')]
            stat = named[0] if named else 'Int'  # Spells default to Int (p. 202)
        elif first in STATS:
            stat = STATS[first]
        elif e['type'].startswith(('Melee Attack', 'Ranged Attack')):
            stat = e['type'].split(', ')[-1]
        else:
            stat = 'None'
        out.append({'name': e['name'], 'kind': e['kind'], 'section': e['section'], 'stat': stat,
                    'passive': 'Passive' in e['type'], 'attack': 'Attack' in e['type'], 'page': e['page']})
    for name, base in CUSTOM_SKILLS.items():
        source = next(x for x in out if x['name'] == base)
        out.append({**source, 'name': name, 'custom': True})
    return out
