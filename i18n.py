"""Vertalingen aan de serverkant (0.15).

De schermen worden in de browser vertaald (pwa/gs-i18n.js). De server heeft de woordenboeken alleen nodig om
getypte antwoorden in elke taal goed te rekenen: wie 'Lion' of 'Löwe' typt bij de leeuw, heeft het goed.
"""
import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LANGS = ('nl', 'en', 'de', 'fr', 'es', 'it')


@lru_cache(maxsize=1)
def _variants():
    out = {}
    for lang in LANGS[1:]:
        f = ROOT / 'pwa' / 'i18n' / f'{lang}.js'
        if not f.is_file(): continue
        text = f.read_text('utf-8')
        try: data = json.loads(text[text.index('={') + 1:text.rindex(';')])
        except (ValueError, json.JSONDecodeError): continue
        for nl, t in data.get('exact', {}).items():
            if len(nl) <= 80: out.setdefault(nl, set()).add(t)
    return out


def variants(text):
    """De tekst zelf plus alle vertalingen ervan."""
    text = str(text)
    return {text} | _variants().get(text, set())


def valid(lang): return lang if lang in LANGS else 'nl'


# Nederlandse uitdrukkingen, spreekwoorden en woordgrappen zijn niet te vertalen. In andere talen slaan
# we die vragen over (dezelfde regel als pwa/bank-loader.js en tools/i18n_extract.py).
import re as _re
DUTCH_ONLY = _re.compile(r'uitdrukking|spreekwoord|dialectwoord|Nederlands woord', _re.I)


def dutch_only(q):
    return bool(isinstance(q, dict) and (DUTCH_ONLY.search(str(q.get('q', ''))) or q.get('topic') == 'Taal & uitdrukkingen'))


def for_lang(questions, lang):
    """Vragenlijst voor deze taal: in het Nederlands alles, anders zonder de onvertaalbare vragen."""
    return list(questions) if valid(lang) == 'nl' else [q for q in questions if not dutch_only(q)]
