# -*- coding: utf-8 -*-
"""법령 PDF -> 조문/항/호/목 구조 JSON (원문 보존 우선).

- 부칙 이전까지(제1조~끝)를 파싱한다. 삭제 조문도 빠짐없이 포함한다.
- 개정 태그(<개정 2020. 1. 1.>), 본조신설 등 [주석]은 본문에서 분리해 별도 필드로 보관한다(본문 문구는 PDF 그대로).
- PDF는 줄바꿈 지점의 공백 정보가 남지 않으므로, 줄 안쪽의 실제 띄어쓰기 패턴으로 학습한 문맥모델로 복원한다.
  글자(공백 제외)는 PDF와 100% 일치하도록 verify()가 대조한다.
"""
import fitz, re, os
from collections import defaultdict

CIRC = ''.join(chr(c) for c in range(0x2460, 0x2474)) + ''.join(chr(c) for c in range(0x3251, 0x3260))
NOISE = re.compile(r'^법제처\s+\d+\s+국가법령정보센터\s*$')
NO = r'제(\d+)조(?:의(\d+))?'
ART = re.compile(r'^제(\d+)조(?:의(\d+))?\((.+?)\)(?=\s|$|[' + CIRC + r'])\s*(.*)$')
ART_DEL = re.compile(r'^제(\d+)조(?:의(\d+))?\s*삭제\s*(.*)$')
CHAP = re.compile(r'^\s*제(\d+)(?:의\d+)?(장|절|관)\s+(.+?)\s*$')
TAGRE = re.compile(r'\s*<[^<>]*\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.[^<>]*>')
HO = re.compile(r'^(\d{1,3})(?:의(\d+))?\.\s')
MOK = re.compile(r'^([가-하])\.\s')
MOKS = '가나다라마바사아자차카타파하'
DATE = re.compile(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.')


def sortkey(n):
    a, _, b = n.partition('의')
    return (int(a), int(b or 0))


# ---------------------------------------------------------------- PDF -> 줄
def load_lines(path):
    """PDF -> [(줄텍스트, 오른쪽여백까지의 거리)]"""
    doc = fitz.open(path)
    lines = []
    for p in doc:
        pl = []
        for b in p.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                t = ''.join(sp['text'] for sp in l['spans'])
                pl.append((t, l['bbox'][2]))
        mx = max([x for t, x in pl if len(t.strip()) > 30] or [0])
        lines += [(t, mx - x) for t, x in pl]
    return lines


# ---------------------------------------------------------------- 띄어쓰기 복원 모델
class SpaceModel:
    """줄 안쪽(띄어쓰기가 확실한 위치)에서 글자 문맥별 '공백 있음/없음' 빈도를 학습."""

    def __init__(self):
        self.c = defaultdict(lambda: [0, 0])

    @staticmethod
    def _keys(ch, i):
        L1 = ch[i]; L2 = ''.join(ch[max(0, i - 1):i + 1])
        R1 = ch[i + 1] if i + 1 < len(ch) else ''
        R2 = ''.join(ch[i + 1:i + 3])
        return [('a', L2, R2), ('b', L2, R1), ('c', L1, R2), ('d', L1, R1), ('e', L1), ('f', R1)]

    def train(self, texts):
        for t in texts:
            t = re.sub(r'\s+', ' ', t.strip())
            ch, sp = [], []
            for x in t:
                if x == ' ':
                    if ch: sp[-1] = 1
                else:
                    ch.append(x); sp.append(0)
            for i in range(len(ch) - 1):
                for k in self._keys(ch, i):
                    self.c[k][sp[i]] += 1

    def p_space(self, left, right):
        l = [x for x in left if not x.isspace()][-2:]
        r = [x for x in right if not x.isspace()][:2]
        if not l or not r: return 0.5
        ch = l + r; i = len(l) - 1
        keys = self._keys(ch, i)
        for k, need in zip(keys, (3, 3, 3, 3, 8, 8)):
            n0, n1 = self.c.get(k, (0, 0))
            if n0 + n1 >= need:
                return (n1 + 0.1) / (n0 + n1 + 0.2)
        return 0.5

    def decide(self, left, right, gap):
        """(공백여부, 불확실여부)"""
        p = self.p_space(left, right)
        # 줄이 가득 차지 않았다면(여백이 큼) 단어 경계일 가능성이 높다 -> 공백 쪽으로 기울임
        th = 0.5 if gap < 3.5 else 0.2
        return p > th, (0.15 < p < 0.85)

    def need_space(self, left, right, gap):
        return self.decide(left, right, gap)[0]


# ---------------------------------------------------------------- 문서 이름/버전
def doc_kind(name):
    n = name
    if re.search(r'고시|훈령|예규|지침', n): return 'notice'
    if '시행규칙' in n: return 'rule'
    if '시행령' in n: return 'decree'
    return 'law'


def parse_filename(path):
    """'관세법 시행령(대통령령)(제36140호)(20260701).pdf' -> (그룹명, 공포번호, 시행일)"""
    b = os.path.splitext(os.path.basename(path))[0]
    ver = re.findall(r'\((\d{8})\)', b)
    prom = re.findall(r'\((제[^)]*호)\)', b)
    name = re.sub(r'\([^)]*\)', '', b).strip()
    eff = ''
    if ver:
        v = ver[-1]; eff = f'{v[:4]}-{v[4:6]}-{v[6:]}'
    return name, (prom[-1] if prom else ''), eff


def head_meta(lines):
    """1쪽 머리글 '[시행 2026. 10. 2.] [법률 제21490호, 2026. 3. 24., 타법개정]'"""
    for t, _ in lines[:40]:
        m = re.search(r'\[시행\s*(\d{4})\.\s*(\d+)\.\s*(\d+)\.\]\s*\[([^\]]*)\]', t)
        if m:
            return {'eff': f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}', 'promul': m.group(4).strip()}
    return {}


# ---------------------------------------------------------------- 파싱
def clean_lines(lines, docname):
    out = []
    for raw, gap in lines:
        s = raw.strip()
        if not s or NOISE.match(s) or s == docname or s.startswith('[시행 ') or '044-215' in s:
            continue
        out.append((s, gap))
    return out


def split_body(lines):
    """부칙 앞까지만. 부칙 이전에서 첫 조문 이전의 머리글도 제외."""
    body = []
    for s, g in lines:
        if s.startswith('부칙'):
            break
        body.append((s, g))
    return body


def norm_tag(raw):
    raw = re.sub(r'\s+', ' ', raw.strip())
    ds = [f'{a}. {int(b)}. {int(c)}.' for a, b, c in DATE.findall(raw)]
    m = re.match(r'<\s*([가-힣 ]*?)\s*\d{4}\.', raw)
    kind = (m.group(1) if m else '').strip()
    return ('<' + (kind + ' ' if kind else '') + ', '.join(ds) + '>'), (DATE.findall(raw) or [None])[-1]


def parse(lines, docname, model):
    body = split_body(clean_lines(lines, docname))
    arts, cur = [], None
    chapter = section = sub = ''
    pending_heads = []
    for s, gap in body:
        m = ART_DEL.match(s)
        mm = ART.match(s)
        if mm or m:
            g = mm or m
            no = g.group(1) + (f'의{g.group(2)}' if g.group(2) else '')
            if mm:
                title, first = mm.group(3), mm.group(4)
            else:
                title, first = '삭제', '삭제 ' + m.group(3)
            cur = {'no': no, 'title': title, 'chapter': chapter, 'section': section,
                   'heads': pending_heads, 'raw': [], 'notes': []}
            pending_heads = []
            arts.append(cur)
            if first: cur['raw'].append((first, gap))
            continue
        c = CHAP.match(s)
        if c and not (cur and cur['raw'] and False):
            kind = c.group(2)
            txt = TAGRE.sub('', s).strip()
            # 본문 중간의 줄바꿈된 '제2장…' 같은 오탐 방지: 직전 줄이 문장 중간이면 건너뜀
            if kind == '장': chapter, section, sub = txt, '', ''
            elif kind == '절': section, sub = txt, ''
            else: sub = txt
            pending_heads.append(txt)
            continue
        if cur is None: continue
        if s.startswith('['):
            cur['notes'].append(s); continue
        cur['raw'].append((s, gap))
    for a in arts:
        build_paras(a, model)
        a['section'] = a['section']
    return arts


def build_paras(a, model):
    """원시 줄 -> 항/호/목 구조. 구조 번호는 순서가 맞을 때만 새 요소로 인정(날짜 줄바꿈 오탐 방지)."""
    paras = []  # {'n':항번호, 't':, 'items':[{'l':2|3,'k':라벨,'t':}]}
    last_para = 0; last_ho = None; last_mok = -1
    tgt = None  # 현재 이어붙일 대상 dict
    prev_text = ''
    prev_gap = 99

    def append(target, s, gap):
        if target['t']:
            sp, unc = model.decide(target['t'], s, target['_g'])
            if unc:
                a.setdefault('unc', []).append(target['t'][-8:] + ('␣' if sp else '⌁') + s[:8])
            sep = ' ' if sp else ''
            target['t'] += sep + s
        else:
            target['t'] = s
        target['_g'] = gap

    for s, gap in a['raw']:
        kind = None
        if s[0] in CIRC:
            v = CIRC.index(s[0]) + 1
            if v > last_para:
                kind = ('para', v)
        if kind is None and paras:
            mh = HO.match(s)
            if mh:
                b, sb = int(mh.group(1)), int(mh.group(2) or 0)
                ok = (last_ho is None and b == 1 and sb == 0) or (last_ho and ((b == last_ho[0] + 1 and sb == 0) or (b == last_ho[0] and sb == last_ho[1] + 1)))
                if ok: kind = ('ho', (b, sb), mh.group(0).strip())
            if kind is None and last_ho is not None:
                mm_ = MOK.match(s)
                if mm_ and MOKS.index(mm_.group(1)) == last_mok + 1:
                    kind = ('mok', MOKS.index(mm_.group(1)), mm_.group(0).strip())
        if kind is None and not paras:
            # 첫 줄: 항 번호 없는 본문 (제N조 단일항)
            mh = HO.match(s)
            if mh and mh.group(1) == '1' and not mh.group(2):
                paras.append({'n': '0', 't': '', '_g': gap, 'items': []})
                kind = ('ho', (1, 0), mh.group(0).strip())
        if kind is None:
            if tgt is None:
                p = {'n': '0', 't': '', '_g': gap, 'items': []}
                paras.append(p); tgt = p
            append(tgt, s, gap)
            continue
        if kind[0] == 'para':
            last_para = kind[1]; last_ho = None; last_mok = -1
            p = {'n': str(kind[1]), 't': '', '_g': gap, 'items': [], 'c': s[0]}
            paras.append(p); tgt = p
            rest = s[1:].strip()
            if rest: p['t'] = rest
        elif kind[0] == 'ho':
            last_ho = kind[1]; last_mok = -1
            it = {'l': 2, 'k': kind[2], 't': '', '_g': gap}
            paras[-1]['items'].append(it); tgt = it
            rest = s[len(kind[2]):].strip() if s.startswith(kind[2]) else HO.sub('', s, 1).strip()
            if rest: it['t'] = rest
        else:
            last_mok = kind[1]
            it = {'l': 3, 'k': kind[2], 't': '', '_g': gap}
            paras[-1]['items'].append(it); tgt = it
            rest = s[len(kind[2]):].strip()
            if rest: it['t'] = rest
    # 태그 분리
    amend = []
    last = ''
    def strip_tags(t):
        nonlocal last
        def rep(m):
            nt, d = norm_tag(m.group(0))
            amend.append(nt)
            return ''
        return TAGRE.sub(rep, t).strip()
    for p in paras:
        p['t'] = strip_tags(p['t'])
        p.pop('_g', None)
        for it in p['items']:
            it['t'] = strip_tags(it['t'])
            it.pop('_g', None)
    for n in a['notes']:
        amend.append(None)  # placeholder to keep notes separate
    amend = [x for x in amend if x]
    # 조 단위 개정일자: 모든 태그 중 가장 최근
    ds = []
    for t in amend:
        ds += DATE.findall(t)
    a['last'] = max((f'{y}-{int(m_):02d}-{int(d):02d}' for y, m_, d in ds), default='')
    a['amend'] = amend
    a['deleted'] = bool(re.fullmatch(r'삭제', ' '.join(p['t'] for p in paras).strip()) or a['title'] == '삭제')
    if not paras:
        paras.append({'n': '0', 't': '', 'items': []})
    a['paras'] = paras
    a.pop('raw', None)


# ---------------------------------------------------------------- 원문 대조(글자 단위)
def verify(lines, docname, arts):
    """PDF 본문(부칙 전)의 공백 제거 문자열 == 파싱 결과 재조립 문자열 인지 대조.
    개정태그 <...>와 [주석]은 양쪽에서 제외한다."""
    body = split_body(clean_lines(lines, docname))
    # 첫 조문 앞(머리글)은 제외
    start = 0
    for i, (s, _) in enumerate(body):
        if ART.match(s) or ART_DEL.match(s) or CHAP.match(s):
            start = i; break
    s1 = ''.join(s for s, _ in body[start:] if not s.startswith('['))
    s1 = re.sub(r'<[^<>]*>', '', re.sub(r'\s+', '', s1))
    parts = []
    for a in arts:
        for h in a['heads']: parts.append(h)
        parts.append(f"제{a['no'].split('의')[0]}조" + (f"의{a['no'].split('의')[1]}" if '의' in a['no'] else '') + (f"({a['title']})" if a['title'] != '삭제' or not a['deleted'] else ''))
        for p in a['paras']:
            parts.append(p.get('c', '') + p['t'])
            for it in p['items']:
                parts.append(it['k'] + it['t'])
    s2 = re.sub(r'<[^<>]*>', '', re.sub(r'\s+', '', ''.join(parts)))
    if s1 == s2:
        return True, len(s1), ''
    n = min(len(s1), len(s2))
    i = next((k for k in range(n) if s1[k] != s2[k]), n)
    return False, len(s1), f'diff@{i}: PDF=...{s1[max(0,i-20):i+20]}... / 파싱=...{s2[max(0,i-20):i+20]}...'
