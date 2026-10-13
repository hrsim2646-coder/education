# -*- coding: utf-8 -*-
"""조문 간 연계(위임/인용/벌칙) 추출. 항(블록) 단위 방향 간선을 만든다.

간선: (출처 doc,조,항) -> (대상 doc,조,항|None)   ty: d=위임  p=벌칙  c=인용
 - 출처 = 인용문을 쓴 쪽, 대상 = 인용당한 쪽 (예: 령 제118조 제1항 -> 법 제100조 제1항)
 - UI는 상위법(대상) -> 하위법령(출처) 방향으로 보여준다.
"""
import re

NO = re.compile(r'제(\d+)조(?:의(\d+))?')
LEVEL = {'law': 0, 'decree': 1, 'rule': 2, 'notice': 3}
DELEG = {
    'decree': re.compile(r'대통령령'),
    'rule': re.compile(r'[가-힣]{0,8}부령|총리령'),
    'notice': re.compile(r'고시|관세청장이\s*정'),
}
PREFIX = [
    ('decree', re.compile(r'(?:「관세법 시행령」|관세법 시행령|(?<![가-힣])영)\s*$')),
    ('rule', re.compile(r'(?:「관세법 시행규칙」|관세법 시행규칙|(?<![가-힣])규칙)\s*$')),
    ('law', re.compile(r'(?:「관세법」|(?<![가-힣])법)\s*$')),
]
SELF = re.compile(r'이\s*(?:법|영|규칙|고시)\s*$')
SAME = re.compile(r'같은\s*(?:법|영)\s*$')
OTHER = re.compile(r'」\s*(?:\([^)]*\))?\s*$')
CONT_GAP = re.compile(r'^(?:제\d+항|제\d+호|[가-하]목|\s|[,ㆍ·]|및|또는|부터|까지|내지|와|과|이나|의)*$')
P_FIRST = re.compile(r'제(\d+)항')
P_NEXT = re.compile(r'(?:\s*[,ㆍ·]\s*|\s*(?:및|또는)\s*)제(\d+)항')
IMPL = re.compile(r'^[^.,;]{0,16}?(?:에\s*따라|에\s*따른|에\s*의하여|에서|규정에\s*(?:따라|의하여))')
P_RANGE = re.compile(r'\s*부터\s*제(\d+)항(?:\s*까지)?')


def key_no(g1, g2):
    return g1 + (f'의{g2}' if g2 else '')


def sortkey(n):
    a, _, b = n.partition('의')
    return (int(a), int(b or 0))


def parse_paras(tail):
    m = P_FIRST.match(tail)
    if not m: return [], 0
    nums = [m.group(1)]; pos = m.end()
    while True:
        r = P_RANGE.match(tail, pos)
        if r:
            a, b = int(nums[-1]), int(r.group(1))
            if 0 < b - a < 15: nums += [str(x) for x in range(a + 1, b + 1)]
            else: nums.append(str(b))
            pos = r.end(); continue
        n = P_NEXT.match(tail, pos)
        if not n: break
        nums.append(n.group(1)); pos = n.end()
    return nums, pos


def extract_refs(text, self_id, valid, ordered):
    """text 안의 조문 인용. 반환 [{s,e,doc,no,pn:[..],mid:[중간 조문들]}]"""
    refs = []
    prev = None
    last_named = None
    for m in NO.finditer(text):
        s = m.start()
        before = text[max(0, s - 40):s]
        doc = None; ext = False
        if SELF.search(before): doc = self_id
        elif SAME.search(before): doc, ext = (last_named, last_named is None)
        else:
            for k, rx in PREFIX:
                if rx.search(before):
                    doc = k; break
            if doc is None and OTHER.search(before):
                ext = True; last_named = None
        if doc is not None and not SAME.search(before) and not SELF.search(before):
            last_named = doc
        cont = False
        if doc is None and not ext and prev is not None:
            gap = text[prev['e']:s]
            if len(gap) <= 18 and CONT_GAP.match(gap):
                doc, cont = prev['doc'], True
                if '부터' in gap: prev_range = True
        if doc is None and ext:
            prev = {'e': m.end(), 'doc': None}
            continue
        if doc is None:
            doc = self_id
        no = key_no(m.group(1), m.group(2))
        pn, pend = parse_paras(text[m.end():m.end() + 80])
        ref = {'s': s, 'e': m.end(), 'pe': m.end() + pend, 'doc': doc, 'no': no, 'pn': pn, 'mid': []}
        if cont and prev and prev.get('doc') == doc and '부터' in text[prev['e']:s] and prev.get('no'):
            lst = ordered.get(doc, [])
            a, b = prev['no'], no
            if a in lst and b in lst and 0 < lst.index(b) - lst.index(a) < 40:
                ref['mid'] = lst[lst.index(a) + 1: lst.index(b)]
        if doc in valid and no in valid[doc]:
            refs.append(ref)
        prev = {'e': m.end(), 'doc': doc, 'no': no}
        # 항 표기까지 포함해 다음 연쇄 판단
        if pn:
            prev['e'] = m.end()  # 항 구문은 CONT_GAP이 허용
    return refs


def block_text(p):
    return p['t'] + ' ' + ' '.join(i['t'] for i in p['items'])


def build(docs):
    """docs: [{'id','kind','arts':[...]}] -> (edges, refspans)
    edges: [(fdoc,fno,fpn,tdoc,tno,tpn|None,ty)]
    refspans: {(doc,no,pn,seg): [[s,e,docid,no]]} seg: 't' 또는 호 인덱스"""
    byid = {d['id']: d for d in docs}
    valid = {d['id']: {a['no'] for a in d['arts']} for d in docs}
    ordered = {d['id']: [a['no'] for a in d['arts']] for d in docs}
    artmap = {d['id']: {a['no']: a for a in d['arts']} for d in docs}
    kind_of = {d['id']: d['kind'] for d in docs}
    edges = {}
    spans = {}
    rank = {'d': 3, 'p': 2, 'c': 1}

    def add(f, t, ty):
        if f[0] == t[0] and f[1] == t[1]: return
        k = f + t
        if k not in edges or rank[ty] > rank[edges[k]]: edges[k] = ty

    for d in docs:
        sid, skind = d['id'], d['kind']
        for a in d['arts']:
            if a['deleted']: continue
            penal = skind == 'law' and '벌칙' in a.get('chapter', '')
            for p in a['paras']:
                pn = p['n']
                segs = [('t', p['t'])] + [(str(i), it['t']) for i, it in enumerate(p['items'])]
                first_len = len(p['t'])
                for si, (seg, txt) in enumerate(segs):
                    if not txt: continue
                    refs = extract_refs(txt, sid, valid, ordered)
                    if refs:
                        spans[(sid, a['no'], pn, seg)] = [[r['s'], r['e'], r['doc'], r['no']] for r in refs]
                    for r in refs:
                        tid = r['doc']
                        if tid == sid and r['no'] == a['no']: continue
                        tkind = kind_of[tid]
                        lead = (seg == 't' and r['s'] < 90) or (seg == '0' and first_len < 25 and r['s'] < 90)
                        targets_nos = [r['no']] + r['mid']
                        for tno in targets_nos:
                            tart = artmap[tid][tno]
                            if LEVEL[tkind] < LEVEL[skind]:
                                pat = DELEG[skind]
                                impl = bool(IMPL.match(txt[r['pe']:r['pe'] + 40]))
                                tparas = {q['n']: q for q in tart['paras']}
                                explicit = [x for x in r['pn'] if x in tparas] if tno == r['no'] else []
                                if explicit:
                                    isd = lead and (impl or any(pat.search(block_text(tparas[x])) for x in explicit))
                                    tl = explicit
                                else:
                                    dl = [q['n'] for q in tart['paras'] if pat.search(block_text(q))]
                                    isd = lead and (bool(dl) or impl)
                                    tl = dl if (isd and dl and len(dl) <= 3) else [None]
                                for x in tl:
                                    add((sid, a['no'], pn), (tid, tno, x), 'd' if isd else 'c')
                            elif tid == sid:
                                tparas = {q['n'] for q in tart['paras']}
                                explicit = [x for x in r['pn'] if x in tparas] if tno == r['no'] else []
                                for x in (explicit or [None]):
                                    add((sid, a['no'], pn), (tid, tno, x), 'p' if penal else 'c')
                            # 하위 -> 상위 방향만 의미 있음(상위법이 하위법을 번호로 인용하는 경우는 제외)
    out = [list(k) + [v] for k, v in edges.items()]
    return out, spans
