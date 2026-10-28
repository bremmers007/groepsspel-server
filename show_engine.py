"""Authoritative phone-controlled shows. Views explicitly whitelist public fields."""
import copy
import difflib
import i18n
import json
import re
import secrets
import unicodedata
import uuid

ROUNDS = ['3-6-9', 'Open Deur', 'Puzzel', 'Galerij', 'Collectief Geheugen', 'Finale']
NUMBERS = dict(zip('nul een twee drie vier vijf zes zeven acht negen tien elf twaalf dertien veertien vijftien zestien zeventien achttien negentien twintig'.split(), map(str, range(21))))
SYNONYMS = {'nederlandse schilder': ['schilder','kunstschilder'], 'afgesneden oor': ['oor','zijn oor'], '5 ringen': ['ringen','olympische ringen'], 'gouden medaille': ['goud'], 'oorsprong in griekenland': ['griekenland','olympia'], 'natuurlijke satelliet van aarde': ['satelliet','natuurlijke satelliet'], 'neil armstrong': ['armstrong'], 'laarsvorm': ['laars','laarsvormig'], 'passagiersschip': ['schip','boot'], 'camping dennen': ['dennen'], 'hond max': ['max'], 'rode auto': ['rood'], 'sport': ['sporten'], 'dieren': ['dier'], 'voorwerpen': ['voorwerp'], 'plaatsen gebouwen': ['plaatsen', 'gebouwen'], 'natuur weer': ['natuur', 'weer'], 'eten drinken': ['eten', 'drinken', 'voedsel'], 'vervoer': ['voertuigen', 'transport'], 'nederland': ['holland'], 'verenigd koninkrijk': ['engeland', 'groot brittannie', 'uk'], 'verenigde staten': ['amerika', 'usa', 'vs'], 'fotocamera': ['camera'], 'gloeilamp': ['lamp'], 'drumstel': ['drums'], 'pretzel': ['krakeling'], 'patat of friet': ['patat', 'friet'], 'j k rowling': ['jk rowling', 'joanne rowling'], 'zwijnstein hogwarts': ['hogwarts', 'zwijnstein'], 'toiletpapier': ['wc papier'], 'aardbeienijs': ['aardbeien ijs']}


class ShowError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def norm(value):
    text = ''.join(c for c in unicodedata.normalize('NFKD', str(value)).casefold() if not unicodedata.combining(c))
    words = re.sub(r'[^a-z0-9 ]', ' ', text).split()
    return ' '.join(NUMBERS.get(w, w) for w in words if w not in ARTICLES)


# Lidwoorden tellen niet mee, in alle zes talen ('de leeuw' = 'leeuw', 'the lion' = 'lion').
ARTICLES = {'de', 'het', 'een', 'the', 'a', 'an', 'der', 'die', 'das', 'ein', 'eine', 'le', 'la', 'les', 'l', 'un', 'une',
            'el', 'los', 'las', 'una', 'il', 'lo', 'gli', 'i'}


def aliases(answer):
    result = set(i18n.variants(answer))      # 0.15: ook de vertalingen van het antwoord tellen als goed
    numeric = re.fullmatch(r'(\d+) (jaar|bezoekers|appels)', str(answer))
    if numeric: result.add(numeric[1])
    if ':' in str(answer): result.add(str(answer).split(':', 1)[0])
    for v in list(result):
        for part in re.split(r'\s*/\s*|\s+(?:of|or|oder|ou|o|oppure)\s+', v):
            result.update(i18n.variants(part))
    result = {norm(x) for x in result if norm(x)}
    for key in list(result): result.update(norm(x) for x in SYNONYMS.get(key, []))
    return result


def matches(text, answers):
    """One exact answer, or one unambiguous single-character typo in a long name."""
    value = norm(text)
    if not value: return None
    accepted = [set().union(*(aliases(a) for a in (answer if isinstance(answer, list) else [answer]))) for answer in answers]
    exact = [i for i, options in enumerate(accepted) if value in options]
    if len(exact) == 1: return exact[0]
    def one_typo(a):
        if min(len(a), len(value)) < 6: return False
        changes = sum(max(i2-i1, j2-j1) for tag,i1,i2,j1,j2 in difflib.SequenceMatcher(None, value, a).get_opcodes() if tag != 'equal')
        return changes == 1
    near = [i for i, options in enumerate(accepted) if any(one_typo(a) for a in options)]
    return near[0] if len(near) == 1 else None


def public_card(song):
    return {k: song[k] for k in ('title', 'artist', 'year')}


class PhoneShow:
    def __init__(self, game, content):
        self.game, self.content = game, content
        if 'phone_show' not in game.s: game.s['phone_show'] = self.blank()
        self.s = game.s['phone_show']
        if self.s.get('mode') and self.s['phase'] != 'end':
            self.s.update(paused=True, pause_reason='Server herstart. Verbind de telefoons en hervat.', stamp=game.clock())
        for team in self.s['teams']: team['seen'] = 0
        self.game._save()

    def quiz_pool(self):
        """0.15: in andere talen geen vragen over Nederlandse uitdrukkingen of woorden."""
        return i18n.for_lang(self.content['quiz'], self.game.s.get('lang', 'nl'))

    def blank(self):
        return {'id': str(uuid.uuid4()), 'code': str(secrets.randbelow(900000)+100000), 'teams': [], 'mode': None, 'phase': 'lobby', 'paused': False, 'pause_reason': '', 'turn_id': str(uuid.uuid4()), 'revision': 0, 'songs': [], 'history': [], 'stamp': self.game.clock(), 'seen_items': []}

    def save(self):
        self.s['revision'] += 1
        self.game._save()

    def token(self):
        self.s['turn_id'] = str(uuid.uuid4())

    def team(self, key):
        team = next((t for t in self.s['teams'] if isinstance(key, str) and secrets.compare_digest(t['token'], key)), None)
        if not team: raise ShowError('Meld je opnieuw aan met je teamcode.', 403)
        return team

    def ids(self): return [t['id'] for t in self.s['teams']]
    def connected(self, team): return self.game.clock()-team['seen'] < 6
    def name(self, ident): return next((t['name'] for t in self.s['teams'] if t['id'] == ident), '')
    def new_question(self):
        self.token(); self.s['last_bad'] = None; self.s['feedback'] = {}; self.s['appeal'] = None
        self.s['stamp'] = self.game.clock()

    def join(self, data):
        with self.game.lock:
            if str(data.get('code')) != self.s['code']: raise ShowError('Onjuiste spelcode.', 403)
            access = str(data.get('access_code', '')).strip().upper()
            if access:
                team = next((t for t in self.s['teams'] if secrets.compare_digest(t['access'], access)), None)
                if not team: raise ShowError('Onjuiste teamcode.', 403)
            else:
                if self.s['mode'] is not None: raise ShowError('Het spel is gestart. Gebruik je bestaande teamcode.')
                name = str(data.get('name', '')).strip()[:35]
                if not name or any(t['name'].casefold() == name.casefold() for t in self.s['teams']): raise ShowError('Kies een unieke teamnaam.')
                if len(self.s['teams']) >= 6: raise ShowError('Maximaal zes teams.')
                team = {'id': str(uuid.uuid4()), 'token': secrets.token_urlsafe(24), 'access': secrets.token_hex(3).upper(), 'name': name, 'seen': 0}
                self.s['teams'].append(team)
            self.tick()
            team['seen'] = self.game.clock(); self.save()
            return {'token': team['token']}

    def draw(self, pool, count):
        import random
        fresh = [copy.deepcopy(q) for q in pool if json.dumps(q, sort_keys=True) not in self.s['seen_items']]
        old = [copy.deepcopy(q) for q in pool if json.dumps(q, sort_keys=True) in self.s['seen_items']]
        random.shuffle(fresh); random.shuffle(old)
        pool = fresh+old
        if pool and all(q.get('topic') for q in pool):
            groups = {}
            for q in pool: groups.setdefault(q['topic'], []).append(q)
            keys = list(groups); random.shuffle(keys); pool = []
            while any(groups.values()):
                for key in keys:
                    if groups[key]: pool.append(groups[key].pop(0))
        picked = pool[:count]
        self.s['seen_items'] = (self.s['seen_items'] + [json.dumps(q, sort_keys=True) for q in picked])[-600:]
        return picked

    def start(self, data):
        s = self.s; mode = data.get('mode'); ids = self.ids()
        if s['mode'] is not None and s['phase'] != 'end': raise ShowError('Rond het lopende spel eerst af of ga terug naar de lobby.')
        if mode not in ('floor', 'smart', 'hitster'): raise ShowError('Onbekend spel.')
        if not 2 <= len(ids) <= 6 or (mode == 'smart' and len(ids) != 3): raise ShowError('Gebruik precies drie teams voor De Bolleboos, anders twee tot zes.')
        if any(not self.connected(t) for t in s['teams']): raise ShowError('Laat alle teamtelefoons eerst aansluiten.')
        style = data.get('style', 'text')
        if style not in ('text', 'choice'): raise ShowError('Kies typen/spreken of antwoordkeuzes.')
        if mode == 'hitster' and len(s['songs']) < len(ids)+6: raise ShowError('Koppel eerst minimaal ' + str(len(ids)+6) + ' lokale muzieknummers.')
        for k in ('duel', 'finalists', 'tied', 'final_tie', 'leader', 'winner', 'winners'):
            s.pop(k, None)
        s.update(result=None, memory_left=0, mode=mode, phase='play', paused=False, pause_reason='', style=style, history=[], banks={i: 0 for i in ids}, active=ids[0], feedback={}, last_bad=None, appeal=None)
        if mode == 'floor':
            seconds = data.get('seconds', 60)
            if seconds not in (45, 60, 90): raise ShowError('Kies 45, 60 of 90 seconden.')
            import random
            # Zonder eigen keuze: twaalf verschillende categorieën, elk spel anders (gelijk aan de pc-variant).
            topics = data.get('topics') or random.sample(list(self.content['floor']), min(12, len(self.content['floor'])))
            if not isinstance(topics, list) or not 1 <= len(topics) <= 17 or any(t not in self.content['floor'] for t in topics): raise ShowError('Kies geldige categorieën.')
            s.update(phase='board', board=[ids[(i+i//4) % len(ids)] for i in range(12)], topics=[topics[i % len(topics)] for i in range(12)], floor_seconds=seconds, duel=None, result=None)
        elif mode == 'smart':
            seconds = data.get('seconds', 90)
            if seconds not in (60, 90, 120): raise ShowError('Kies 60, 90 of 120 startseconden.')
            s.update(round=0, topic=0, index=0, banks={i: seconds for i in ids}, deck=self.draw([q for q in self.quiz_pool() if q.get('topic') not in ('Rekenen', 'Chemische symbolen')], 15), sets={k: self.draw(self.content['smart'][k], 3 if k != 'final' else 20) for k in ('opens', 'puzzles', 'galleries', 'memories', 'final')}, used=[], passed=[], gallery=0, memory_left=0, question_left=30, memory_counts={}, order=ids.copy())
        else:
            target = data.get('target', 10); level = data.get('level', 'original')
            if target not in (5, 10, 15) or level not in ('original', 'pro', 'expert'): raise ShowError('Ongeldige Hitlijn-instelling.')
            deck = self.draw(s['songs'], len(s['songs']))
            timelines = {i: [deck.pop()] for i in ids}
            s.update(target=target, level=level, deck=deck, timelines=timelines, tokens={i: {'original': 2, 'pro': 5, 'expert': 3}[level] for i in ids}, active=min(ids, key=lambda i: timelines[i][0]['year']))
            self.hit_next()
        self.new_question()

    def smart_q(self):
        s = self.s
        if s.get('tied'): return s['tie_q']
        if s['round'] == 0: return s['deck'][s['index']]
        return s['sets'][['', 'opens', 'puzzles', 'galleries', 'memories', 'final'][s['round']]][s['topic']]

    def pending(self, result, kind):
        self.s.update(phase='reveal', result=result, reveal_left=3, next_kind=kind)
        self.new_question()

    def smart_round(self):
        s = self.s; s['round'] += 1; s['topic'] = 0
        s['order'] = sorted(self.ids(), key=lambda i: (s['banks'][i] <= 0, s['banks'][i]))
        if s['round'] == 5:
            order = sorted(self.ids(), key=lambda i: -s['banks'][i]); cutoff = s['banks'][order[1]]
            fixed = [i for i in order if s['banks'][i] > cutoff]; tied = [i for i in order if s['banks'][i] == cutoff]
            if len(fixed)+len(tied) > 2:
                s.update(tied=tied, tie_fixed=fixed, tie_slots=2-len(fixed), tie_q=self.draw(self.quiz_pool(), 1)[0], tie_answers={}, question_left=25, phase='play')
                self.new_question(); return
            self.smart_final(fixed+tied); return
        self.smart_topic()

    def smart_final(self, finalists):
        s = self.s; s['finalists'] = finalists; s['tied'] = []; s['leader'] = None
        self.smart_topic()

    def smart_topic(self):
        s = self.s; s.update(phase='play', used=[], passed=[], gallery=0, memory_counts={}, memory_left=15 if s['round'] == 4 else 0)
        candidates = s.get('finalists', self.ids()) if s['round'] == 5 else self.ids()
        s['active'] = min(candidates, key=lambda i: (s['banks'][i] <= 0, s['banks'][i])) if s['round'] == 5 else s['order'][s['topic'] % len(s['order'])]
        self.new_question()
        if s['round'] == 5: self.smart_check_end()
        elif all(s['banks'][i] <= 0 for i in self.ids()): self.smart_round()
        elif s['banks'][s['active']] <= 0: self.smart_pass()

    def smart_check_end(self):
        s = self.s
        losers = [i for i in s['finalists'] if s['banks'][i] <= 0]
        if len(losers)==2:
            s.update(tied=s['finalists'].copy(), final_tie=True, tie_q=self.draw(self.quiz_pool(),1)[0], tie_answers={}, question_left=25, phase='play')
            self.new_question(); return True
        if losers:
            s.update(phase='end', winner=next((i for i in s['finalists'] if i not in losers), None), result={'message': 'De finale tussen de twee hoogste teams is afgelopen.'})
            self.new_question(); return True
        return False

    def smart_next(self, kind):
        s = self.s
        if kind == 'question':
            s['index'] += 1; s['passed'] = []; s['question_left'] = 30
            if s['index'] >= len(s['deck']): self.smart_round()
            else: s['phase'] = 'play'; s['active'] = self.ids()[(self.ids().index(s['active'])+1) % len(self.ids())]; self.new_question()
        elif kind == 'topic':
            s['topic'] += 1
            if s['round'] < 5 and s['topic'] >= 3: self.smart_round()
            elif s['round'] == 5 and s['topic'] >= len(s['sets']['final']):
                # Finite topics: compare remaining banks, with an automatic quiz tiebreak.
                ids = s['finalists']; best = max(s['banks'][i] for i in ids); winners = [i for i in ids if s['banks'][i] == best]
                if len(winners) == 1:
                    s.update(phase='end', winner=winners[0], result={'message': 'Finalepakket op. Hoogste resterende tijd wint.'})
                else:
                    s.update(tied=winners, final_tie=True, tie_q=self.draw(self.quiz_pool(), 1)[0], tie_answers={}, question_left=25, phase='play')
                    self.new_question()
            else: self.smart_topic()
        elif kind == 'tie':
            correct = [i for i, good in s['tie_answers'].items() if good]
            if s.get('final_tie'):
                if len(correct) == 1: s.update(phase='end', winner=correct[0]); return
                s['tied'] = correct or s['tied']
            else:
                slots = s['tie_slots']; fixed = s['tie_fixed']
                if len(correct) == slots: self.smart_final(fixed+correct); return
                if 0 < len(correct) < slots:
                    s['tie_fixed'] = fixed+correct; s['tie_slots'] -= len(correct); s['tied'] = [i for i in s['tied'] if i not in correct]
                    if len(s['tied']) == s['tie_slots']: self.smart_final(s['tie_fixed']+s['tied']); return
                elif len(correct) > slots: s['tied'] = correct
            s.update(tie_q=self.draw(self.quiz_pool(), 1)[0], tie_answers={}, question_left=25, phase='play'); self.new_question()

    def smart_pass(self):
        s = self.s; q = self.smart_q(); ident = s['active']
        if s['round'] == 0:
            s['passed'].append(ident)
            if len(s['passed']) >= len(self.ids()): self.pending({'answers': [q['a']], 'message': 'Iedereen heeft gepast.'}, 'question')
            else: s['active'] = self.ids()[(self.ids().index(ident)+1) % len(self.ids())]; self.new_question()
            return
        if s['round'] == 5 and self.smart_check_end(): return
        s['passed'].append(ident)
        candidates = [i for i in (s['finalists'] if s['round'] == 5 else self.ids()) if i not in s['passed'] and s['banks'][i] > 0]
        if not candidates: self.pending({'answers': q['answers'], 'message': 'Onderwerp afgerond.'}, 'topic')
        else:
            s['active'] = min(candidates, key=lambda i: s['banks'][i]); self.new_question()

    def smart_good(self, index):
        s = self.s; q = self.smart_q(); ident = s['active']; r = s['round']
        if r == 0:
            if (s['index']+1) % 3 == 0: s['banks'][ident] += 10
            self.pending({'answers': [q['a']], 'message': self.name(ident) + ' antwoordt goed.'}, 'question'); return
        s['used'].append(index)
        if r == 5:
            other = next(i for i in s['finalists'] if i != ident); s['banks'][other] = max(0, s['banks'][other]-20)
            if self.smart_check_end(): return
        else:
            n = s['memory_counts'].get(ident, 0)+1; s['memory_counts'][ident] = n
            s['banks'][ident] += {1: 20, 2: 30, 3: 15, 4: n*10}[r]
        s['feedback'][ident] = 'Goed!'
        if r == 3:
            remaining = [i for i in range(8) if i not in s['used']]
            if remaining: s['gallery'] = remaining[0]
        if len(s['used']) == len(q['answers']): self.pending({'answers': q['answers'], 'message': 'Alle antwoorden gevonden.'}, 'topic')
        else: self.new_question()

    def floor_card(self):
        d = self.s['duel']; return d['cards'][d['index']]

    def floor_end(self, loser):
        s = self.s; d = s['duel']; winner = next(i for i in d['banks'] if i != loser)
        if loser == d['attacker']: s['board'][d['source']] = winner
        else: s['board'][d['cell']] = winner
        s.update(active=winner, phase='end' if len(set(s['board'])) == 1 else 'board', result={'message': self.name(winner) + ' wint het duel en verovert één vak van ' + self.name(loser) + '.'}, winner=winner)
        self.new_question()

    def floor_next(self):
        d = self.s['duel']; d['index'] += 1
        if d['index'] >= len(d['cards']):
            # Exhausted category: draw a fresh shuffled cycle, explicitly reported.
            d['cards'] = self.draw(self.content['floor'][d['topic']], len(self.content['floor'][d['topic']]))
            d['index'] = 0
        self.new_question(); self.options()

    def options(self):
        s = self.s
        if s['mode'] == 'floor':
            q = self.floor_card(); answer = q['answer']; pool = [c['answer'] for c in self.content['floor'][s['duel']['topic']]]
            import random
            wrong = list({p for p in pool if not (aliases(p) & aliases(answer))}); random.shuffle(wrong)
            choices = [answer] + wrong[:3]; random.shuffle(choices); s['choices'] = choices

    def hit_next(self):
        s = self.s
        if not s['deck']:
            most = max(len(x) for x in s['timelines'].values()); s.update(phase='end', winners=[i for i in self.ids() if len(s['timelines'][i]) == most], result={'message': 'Muzieklijst uitgespeeld; meeste kaarten wint.'}); return
        s.update(current=s['deck'].pop(), phase='listen', placement=None, challenges=[], challenge_left=0)
        self.new_question()

    def hit_valid_position(self, song, cards, position):
        return 0 <= position <= len(cards) and (position == 0 or cards[position-1]['year'] <= song['year']) and (position == len(cards) or song['year'] <= cards[position]['year'])

    def hit_insert(self, ident, song):
        s = self.s; s['timelines'][ident].append(song); s['timelines'][ident].sort(key=lambda c: c['year'])

    def hit_reveal(self):
        s = self.s; ident = s['active']; song = s['current']; placement = s['placement']; winner = None
        correct = self.hit_valid_position(song, s['timelines'][ident], placement['position'])
        identity = matches(placement.get('title', ''), [song['title']]) is not None and matches(placement.get('artist', ''), [song['artist']]) is not None
        if s['level'] == 'original' and identity: s['tokens'][ident] = min(5, s['tokens'][ident]+1)
        if s['level'] != 'original': correct = correct and identity
        if s['level'] == 'expert': correct = correct and str(placement.get('year')) == str(song['year'])
        if correct: winner = ident
        else:
            for challenge in s['challenges']:
                if self.hit_valid_position(song, s['timelines'][ident], challenge['position']): winner = challenge['team']; break
        if winner: self.hit_insert(winner, song)
        s.update(phase='reveal', result={'message': self.name(winner) + ' krijgt de kaart.' if winner else 'Niemand krijgt de kaart.', 'song': public_card(song)}, reveal_left=5)
        self.new_question()
        if winner and len(s['timelines'][winner]) >= s['target']: s.update(phase='end', winners=[winner])

    def tick(self):
        s = self.s; now = self.game.clock(); elapsed = max(0, now-s['stamp']); s['stamp'] = now
        if not s['mode'] or s['paused'] or s['phase'] == 'end': return
        required = s.get('finalists', self.ids()) if s['mode'] == 'smart' and s.get('round') == 5 and not s.get('tied') else self.ids()
        missing = [t for t in s['teams'] if t['id'] in required and not self.connected(t)]
        if missing:
            cutoff = min(t['seen']+6 for t in missing)
            elapsed = min(elapsed, max(0, cutoff-(now-elapsed)))
        if s['phase'] == 'reveal':
            s['reveal_left'] -= elapsed
            if s['reveal_left'] <= 0:
                if s['mode'] == 'smart': self.smart_next(s['next_kind'])
                elif s['mode'] == 'hitster': s['active'] = self.ids()[(self.ids().index(s['active'])+1) % len(self.ids())]; self.hit_next()
                self.save()
        elif s['mode'] == 'floor' and s['phase'] == 'duel':
            d = s['duel']; d['banks'][s['active']] = max(0, d['banks'][s['active']]-elapsed); d['lock_left'] = max(0, d['lock_left']-elapsed)
            if d['banks'][s['active']] <= 0: self.floor_end(s['active']); self.save()
        elif s['mode'] == 'smart' and s['phase'] == 'play':
            if s['memory_left'] > 0: s['memory_left'] = max(0, s['memory_left']-elapsed)
            elif s.get('tied') or s['round'] == 0:
                s['question_left'] -= elapsed
                if s['question_left'] <= 0:
                    if s.get('tied'): self.pending({'answers': [self.smart_q()['a']], 'message': 'Beslissingsvraag gesloten.'}, 'tie')
                    else: self.smart_pass(); s['question_left'] = 30
                    self.save()
            else:
                s['banks'][s['active']] = max(0, s['banks'][s['active']]-elapsed)
                if s['banks'][s['active']] <= 0: self.smart_pass(); self.save()
        elif s['mode'] == 'hitster' and s['phase'] == 'challenge':
            s['challenge_left'] -= elapsed
            if s['challenge_left'] <= 0: self.hit_reveal(); self.save()
        if now-getattr(self, '_checkpoint', 0) > 2:
            self._checkpoint = now; self.save()
        if missing and s['phase'] != 'end':
            s.update(paused=True, pause_reason='Verbinding weg: ' + ', '.join(t['name'] for t in missing) + '. Verbind opnieuw en hervat.'); self.save()

    def action(self, key, data):
        with self.game.lock:
            self.tick(); s = self.s; action = data.get('action')
            if action in ('start', 'reset', 'pause', 'resume', 'remove', 'delete_song'):
                self.game.host(key)
                if action == 'start':
                    before = copy.deepcopy(s)
                    try: self.start(data)
                    except Exception:
                        s.clear(); s.update(before); raise
                elif action == 'reset':
                    s.update(mode=None, phase='lobby', paused=False, appeal=None, history=[]); self.new_question()
                elif action == 'pause': s.update(paused=True, pause_reason='Gepauzeerd op de pc.')
                elif action == 'resume':
                    if s.get('appeal'): raise ShowError('Rond eerst het groepsbezwaar af.')
                    if any(not self.connected(t) for t in s['teams']): raise ShowError('Laat alle teams opnieuw verbinden.')
                    s.update(paused=False, pause_reason='', stamp=self.game.clock())
                elif action == 'remove':
                    if s['mode']: raise ShowError('Verwijder teams alleen in de lobby.')
                    s['teams'] = [t for t in s['teams'] if t['id'] != data.get('id')]
                elif action == 'delete_song':
                    if s['mode']: raise ShowError('Wijzig muziek alleen in de lobby.')
                    s['songs'] = [x for x in s['songs'] if x['id'] != data.get('id')]
                self.save(); return {'ok': True}
            team = self.team(key); team['seen'] = self.game.clock(); ident = team['id']
            if data.get('turn_id') != s['turn_id']: raise ShowError('De beurt is veranderd. Je antwoord is niet verwerkt.', 409)
            if action == 'vote':
                appeal = s.get('appeal')
                if not appeal or ident == appeal['team']: raise ShowError('Geen open groepsbezwaar.')
                appeal['votes'][ident] = data.get('yes') is True
                if len(appeal['votes']) == len(self.ids())-1:
                    accepted = all(appeal['votes'].values()); index = appeal['index']; s.update(appeal=None, paused=False, pause_reason='')
                    if accepted: self.apply_good(index)
                    else: s['feedback'][appeal['team']] = 'De groep heeft het bezwaar afgewezen.'
                    self.token()
                self.save(); return {'ok': True}
            if action=='answer' and (not isinstance(data.get('text'),str) or not 1<=len(data['text'])<=200): raise ShowError('Gebruik een antwoord van 1 tot 200 tekens.')
            if s['paused']: raise ShowError('Het spel is gepauzeerd.')
            if action == 'appeal':
                bad = s.get('last_bad')
                if not bad or bad['team'] != ident: raise ShowError('Er is geen recent afgewezen antwoord van jullie.')
                # A single image/question answer can be judged by the group. For multi-
                # keyword rounds choose which unrevealed keyword was intended only after
                # the topic: never disclose the private keyword list for a live appeal.
                if bad.get('index') is None: raise ShowError('Gebruik bij deze ronde een andere formulering of pas.')
                s.update(paused=True, pause_reason='Groepsbezwaar: klopt het ingesproken antwoord?', appeal={**bad, 'votes': {}}); self.save(); return {'ok': True}
            if s['mode'] == 'floor': self.floor_action(ident, action, data)
            elif s['mode'] == 'smart': self.smart_action(ident, action, data)
            elif s['mode'] == 'hitster': self.hit_action(ident, action, data)
            else: raise ShowError('Wacht tot het spel gestart is.')
            self.save(); return {'ok': True}

    def apply_good(self, index):
        s = self.s
        if s['mode'] == 'floor':
            s['active'] = next(i for i in s['duel']['banks'] if i != s['active']); s['duel']['lock_left'] = 0; self.floor_next()
        else: self.smart_good(index)

    def bad(self, ident, text, index=None):
        self.s['feedback'][ident] = 'Niet herkend als juist antwoord. Probeer een andere schrijfwijze of pas.'
        self.s['last_bad'] = {'team': ident, 'text': str(text)[:200], 'index': index}
        self.token()

    def floor_action(self, ident, action, data):
        s = self.s
        if ident != s['active']: raise ShowError('Jullie zijn niet aan de beurt.')
        if s['phase'] == 'board':
            if action == 'give':
                # Beurt rouleert in vaste teamvolgorde naar het volgende team dat nog vakken heeft.
                order = [i for i in self.ids() if i in s['board']]; s['active'] = order[(order.index(ident)+1) % len(order)]; self.new_question(); return
            cell = data.get('cell')
            if action != 'tile' or type(cell) is not int or not 0 <= cell < 12 or s['board'][cell] == ident: raise ShowError('Kies een vak van een tegenstander.')
            adjacent = any(owner == ident and (abs(i-cell) == 4 or (i//4 == cell//4 and abs(i-cell) == 1)) for i, owner in enumerate(s['board']))
            if not adjacent: raise ShowError('Kies een aangrenzend vak.')
            topic = s['topics'][cell]; opponent = s['board'][cell]
            source = next(i for i, owner in enumerate(s['board']) if owner == ident and (abs(i-cell) == 4 or (i//4 == cell//4 and abs(i-cell) == 1)))
            s.update(phase='duel', duel={'cell': cell, 'source': source, 'attacker': ident, 'topic': topic, 'cards': self.draw(self.content['floor'][topic], len(self.content['floor'][topic])), 'index': 0, 'banks': {ident: s['floor_seconds'], opponent: s['floor_seconds']}, 'lock_left': 0})
            self.new_question(); self.options(); return
        if s['phase'] != 'duel': raise ShowError('Dit duel is afgelopen.')
        d = s['duel']
        if d['lock_left'] > 0: raise ShowError('Wacht tot de pasblokkade voorbij is.')
        if action == 'pass': d['lock_left'] = 3; self.floor_next(); return
        if action != 'answer': raise ShowError('Onbekende actie.')
        q = self.floor_card(); text = data.get('text', '')
        index = matches(text, [q.get('answers', [q['answer']])])
        if index is None: self.bad(ident, text, 0)
        else: self.apply_good(0)

    def smart_action(self, ident, action, data):
        s = self.s; q = self.smart_q()
        if s['phase'] != 'play': raise ShowError('Wacht op de volgende vraag.')
        if s.get('tied'):
            if action != 'answer' or ident not in s['tied'] or ident in s['tie_answers']: raise ShowError('Jullie antwoord is al ingestuurd of jullie spelen deze vraag niet.')
            s['tie_answers'][ident] = matches(data.get('text', ''), [q.get('answers', [q['a']])]) is not None
            if len(s['tie_answers']) == len(s['tied']): self.pending({'answers': [q['a']], 'message': 'Beslissingsvraag gesloten.'}, 'tie')
            return
        if ident != s['active']: raise ShowError('Jullie zijn niet aan de beurt.')
        if s['memory_left'] > 0: raise ShowError('Bekijk eerst de geheugenscène.')
        if action == 'pass': self.smart_pass(); return
        if action == 'skip' and s['round'] == 3:
            remaining = [i for i in range(8) if i not in s['used']]
            if len(remaining) <= 1: self.smart_pass()
            else: s['gallery'] = remaining[(remaining.index(s['gallery'])+1) % len(remaining)]; self.new_question()
            return
        if action != 'answer': raise ShowError('Onbekende actie.')
        answers = [q.get('answers', [q['a']])] if s['round'] == 0 else q['answers']
        index = matches(data.get('text', ''), answers)
        if index is None or index in s['used'] or (s['round'] == 3 and index != s['gallery']):
            self.bad(ident, data.get('text', ''), 0 if s['round'] == 0 else s['gallery'] if s['round'] == 3 else None)
        else: self.smart_good(index)

    def hit_action(self, ident, action, data):
        s = self.s
        if action == 'challenge' and s['phase'] == 'challenge':
            position = data.get('position')
            if ident == s['active'] or any(c['team'] == ident for c in s['challenges']) or s['tokens'][ident] < 1: raise ShowError('Jullie kunnen deze kaart niet uitdagen.')
            occupied = [s['placement']['position']] + [c['position'] for c in s['challenges']]
            if type(position) is not int or not 0 <= position <= len(s['timelines'][s['active']]) or position in occupied: raise ShowError('Kies een andere vrije positie.')
            s['tokens'][ident] -= 1; s['challenges'].append({'team': ident, 'position': position}); return
        if ident != s['active'] or s['phase'] != 'listen': raise ShowError('Jullie zijn niet aan de beurt.')
        if action == 'skip':
            if s['tokens'][ident] < 1: raise ShowError('Onvoldoende tokens.')
            s['tokens'][ident] -= 1; self.hit_next()
        elif action == 'buy':
            if s['tokens'][ident] < 3: raise ShowError('Onvoldoende tokens.')
            s['tokens'][ident] -= 3; self.hit_insert(ident, s['current'])
            if len(s['timelines'][ident]) >= s['target']: s.update(phase='end', winners=[ident], result={'song': public_card(s['current']), 'message': self.name(ident)+' wint!'})
            else: self.hit_next()
        elif action == 'place':
            position = data.get('position')
            if type(position) is not int or not 0 <= position <= len(s['timelines'][ident]): raise ShowError('Kies een plaats in je tijdlijn.')
            s.update(phase='challenge', placement={k: str(data.get(k, ''))[:150] for k in ('title', 'artist', 'year')}, challenges=[], challenge_left=8)
            s['placement']['position'] = position; self.new_question()
        else: raise ShowError('Onbekende actie.')

    def view(self, key=None, role='public'):
        with self.game.lock:
            self.tick(); s = self.s; me = None
            if role == 'host': self.game.host(key)
            elif role == 'team': me = self.team(key); me['seen'] = self.game.clock()
            elif role != 'public': raise ShowError('Onbekende schermrol.')
            out = {k: copy.deepcopy(s[k]) for k in ('id', 'code', 'mode', 'phase', 'paused', 'pause_reason', 'turn_id', 'revision')}
            out.update(server_time=self.game.clock(), teams=[{'id': t['id'], 'name': t['name'], 'connected': self.connected(t)} for t in s['teams']], active=s.get('active'), message='', result=copy.deepcopy(s.get('result')) if s['phase'] in ('reveal', 'end', 'board') else None)
            if me: out['me'] = {'id': me['id'], 'name': me['name'], 'access': me['access'], 'feedback': s.get('feedback', {}).get(me['id']), 'can_appeal': s.get('last_bad', {}).get('team') == me['id'] and s.get('last_bad', {}).get('index') is not None if s.get('last_bad') else False}
            if role == 'host' and not s['mode']:
                out.update(songs=[public_card(x) | {'id': x['id']} for x in s['songs']], categories=list(self.content['floor']))
            if s.get('appeal'): out['appeal'] = {k: copy.deepcopy(v) for k, v in s['appeal'].items() if k in ('team', 'text', 'votes')}
            if not s['mode']: return out
            out['banks'] = s['banks']
            if s['mode'] == 'floor':
                out.update(board=s['board'], topics=s['topics'])
                if s['phase'] == 'duel':
                    q = self.floor_card(); out.update(prompt=q['visual'], category=s['duel']['topic'], banks=s['duel']['banks'], lock_left=s['duel']['lock_left'])
                    if me and s['style'] == 'choice': out['choices'] = s['choices']
            elif s['mode'] == 'smart':
                out.update(round=s['round'], round_name=ROUNDS[s['round']], topic=s['topic'], index=s['index'], used_count=len(s['used']), leader=s.get('leader'), winner=s.get('winner'), memory_left=s['memory_left'], question_left=s['question_left'], tied=s.get('tied', []))
                if s['phase'] == 'play':
                    q = self.smart_q(); out['prompt'] = q['q']
                    if s.get('tied'):
                        if me: out['choices'] = q.get('options') if s['style'] == 'choice' else None; out['submitted'] = me['id'] in s['tie_answers']
                    elif s['round'] == 0:
                        if me and s['style'] == 'choice': out['choices'] = q.get('options')
                    else:
                        if q.get('words'): out['words'] = q['words']
                        if s['round'] == 3: out.update(visual=q['cards'][s['gallery']], gallery_index=s['gallery'])
                        if s['round'] == 4 and s['memory_left'] > 0: out['story'] = q['story']
            else:
                out.update(timelines={i: [public_card(c) for c in cards] for i, cards in s['timelines'].items()}, tokens=s['tokens'], target=s['target'], level=s['level'], winners=s.get('winners', []), challenge_left=s.get('challenge_left', 0), placement=s.get('placement', {}).get('position') if s.get('placement') else None, challenges=copy.deepcopy(s.get('challenges', [])))
                if s['phase'] in ('listen', 'challenge'): out['audio'] = '/show-audio/' + s['current']['id']
            if me and me['id'] == s.get('active') and not s['paused']: out['answering'] = s['phase'] in ('play', 'duel', 'listen') and s.get('memory_left', 0) <= 0 and (s.get('duel') or {}).get('lock_left', 0) <= 0
            return copy.deepcopy(out)
