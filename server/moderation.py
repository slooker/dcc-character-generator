"""Screens names and shared text for slurs, sexual terms and strong profanity.

Custom Race/Class names and the text of shared builds are public, and profile
names are shown as their authors, so all of them go through `inappropriate()`.

The check normalizes the text first so simple tricks don't get past it:
accents are stripped, common look-alike characters are mapped back to letters
("sh1t", "@ss", "$lut"), repeated letters still match ("fuuuck"), and letters
spaced out one at a time are joined ("f u c k"). Then:

- WORDS must match a whole word, because they also occur inside harmless
  words ("ass" in "Bass", "cock" in "Cockroach", "rape" in "Grape");
- FRAGMENTS match inside a word too ("Fuckface"), except in a few harmless
  words that contain them (ALLOWED). Fragments aren't matched across word
  boundaries, so "Arcanic Untamed" is fine.

Edit the lists below to change what is blocked. Mild words (damn, hell, crap,
bastard as in "Bastard Sword") are allowed, in keeping with the books.
"""
import re
import unicodedata

WORDS = {
    # profanity and sexual terms
    'anal', 'anus', 'arse', 'arsehole', 'ass', 'asses', 'asshole', 'assholes', 'bitch', 'bitches', 'bitchy',
    'blowjob', 'bollocks', 'boner', 'boob', 'boobs', 'butthole', 'clit', 'cock', 'cocks', 'cum', 'cumming',
    'dick', 'dicks', 'fuk', 'fuks', 'fukin', 'fuking', 'fuker', 'dickhead', 'dildo', 'dildos', 'ejaculate', 'erection', 'fap', 'handjob', 'hentai', 'horny',
    'jizz', 'milf', 'nude', 'nudes', 'orgasm', 'orgy', 'penis', 'porn', 'porno', 'prick', 'pricks', 'pussy',
    'pussies', 'rimjob', 'scrotum', 'semen', 'sex', 'sexy', 'shit', 'shits', 'shitty', 'shithead', 'slut',
    'sluts', 'slutty', 'testicle', 'testicles', 'tit', 'tits', 'titty', 'titties', 'twat', 'vagina', 'wank',
    'wanker', 'whore', 'whores',
    # slurs
    'chink', 'chinks', 'coon', 'coons', 'darkie', 'dyke', 'dykes', 'fag', 'fags', 'gook', 'gooks', 'kike',
    'kikes', 'negro', 'paki', 'pakis', 'raghead', 'retard', 'retards', 'retarded', 'spic', 'spics', 'tranny',
    'trannies', 'wetback', 'wop',
    # violence and hate
    'kkk', 'molest', 'molester', 'nazi', 'nazis', 'pedo', 'pedos', 'rape', 'raped', 'rapes', 'rapist',
    'rapists', 'raping', 'incest',
}
FRAGMENTS = {
    'fuck', 'cunt', 'nigger', 'nigga', 'faggot', 'motherf', 'cocksuck', 'pedophil', 'paedophil',
    'hitler', 'heilhitler', 'siegheil', 'whitepower', 'jizz', 'shithead', 'asshole', 'bestiality', 'childporn',
}
ALLOWED = {'scunthorpe', 'shiitake'}
# Book terms that would otherwise be blocked (Vine Porn is a Skill, dcc-skills.pdf).
# Only the phrase itself is allowed: the rest of the text is still checked.
ALLOWED_PHRASES = ('vine porn',)

LOOKALIKES = str.maketrans({'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't', '€': 'e'})


def _pattern(word: str) -> str:
    # Each letter may repeat: "fuuuck" matches "fuck", "asss" matches "ass".
    return ''.join(f'{re.escape(c)}+' for c in word)


WORD_RE = re.compile(r'^(?:' + '|'.join(_pattern(w) for w in sorted(WORDS, key=len, reverse=True)) + r')$')
FRAGMENT_RE = re.compile('|'.join(_pattern(w) for w in sorted(FRAGMENTS, key=len, reverse=True)))


def _tokens(text: str) -> list[str]:
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower().translate(LOOKALIKES)
    tokens = re.findall(r'[a-z]+', text)
    # Join runs of single letters: "f u c k" -> "fuck".
    joined: list[str] = []
    run = ''
    for token in tokens:
        if len(token) == 1:
            run += token
            continue
        if run:
            joined.append(run)
            run = ''
        joined.append(token)
    if run:
        joined.append(run)
    return joined


def _without(tokens: list[str], words: list[str]) -> list[str]:
    """`tokens` with every run equal to `words` removed."""
    out, i = [], 0
    while i < len(tokens):
        if tokens[i:i + len(words)] == words:
            i += len(words)
        else:
            out.append(tokens[i])
            i += 1
    return out


def inappropriate(text: str) -> bool:
    tokens = _tokens(text or '')
    for phrase in ALLOWED_PHRASES:
        tokens = _without(tokens, phrase.split())
    return any(WORD_RE.match(token) or (token not in ALLOWED and FRAGMENT_RE.search(token)) for token in tokens)


NAME_MIN = 2
NAME_MAX = 40
NAME_RE = re.compile(r"^[^\W_][\w '’\-.&,!?():/]*$")
LINK_RE = re.compile(r'(https?:|www\.|\.(com|net|org|io|gg|xyz|co|us|ru|tv)\b)', re.I)


def name_issue(name: str) -> str | None:
    """Why `name` can't be a custom Race/Class name, or None."""
    if not NAME_MIN <= len(name) <= NAME_MAX:
        return f'Names must be {NAME_MIN} to {NAME_MAX} characters.'
    if not NAME_RE.match(name) or not re.search(r'[^\W\d_]', name):
        return 'Names can use letters, numbers, spaces and simple punctuation.'
    if LINK_RE.search(name):
        return 'Names can’t contain links.'
    if inappropriate(name):
        return 'That name isn’t allowed. Choose something without slurs, sexual terms or strong profanity.'
    return None
