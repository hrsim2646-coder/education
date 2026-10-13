# -*- coding: utf-8 -*-
"""법령 연계 웹앱 빌드.

사용:  python -I build_app.py [--reparse]

 BACKDATA/ 의 PDF(법·령·칙·고시)를 읽어
   DATA/snapshots/<문서>/<시행일>__<해시>.json  (버전별 원문 스냅샷, 개정 비교의 기준)
   DATA/export/lawgraph.json                    (후속 문제출제/논술 등에 쓰는 원천 데이터)
   APP/관세법_법령연계_웹앱.html                 (단일 파일 웹앱)
 을 만든다.  새 개정판 PDF를 BACKDATA에 넣고 다시 실행하면 직전 버전과 자동 비교(변경 전/후)된다.
 고시 PDF(파일명에 '고시' 포함)를 넣으면 4번째 열로 자동 연결된다.

 수동 보정: DATA/text_overrides.json (띄어쓰기만), DATA/links_manual.json (연계 추가/삭제)
"""
import os, sys, re, json, glob, hashlib, datetime
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lawparse as L
import linker as K

LAW = os.path.abspath(os.path.join(HERE, '..', '..'))
BACK = os.path.join(LAW, 'BACKDATA')
DATA = os.path.join(LAW, 'DATA')
SNAP = os.path.join(DATA, 'snapshots')
EXPORT = os.path.join(DATA, 'export')
APP = os.path.join(LAW, 'APP')
TEMPLATE = os.path.join(HERE, 'app_template.html')
OUT_HTML = os.path.join(APP, '관세법_법령연계_웹앱.html')

BASE_IDS = {'관세법': ('law', 'law'), '관세법 시행령': ('decree', 'decree'), '관세법 시행규칙': ('rule', 'rule')}
COL = {'law': 0, 'decree': 1, 'rule': 2, 'notice': 3}
LABEL = {'law': '법', 'decree': '령', 'rule': '칙', 'notice': '고시'}


def sha1(path):
    h = hashlib.sha1()
    with open(path, 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''):
            h.update(ch)
    return h.hexdigest()


def doc_identity(name):
    if name in BASE_IDS:
        return BASE_IDS[name]
    return ('n' + hashlib.md5(name.encode('utf-8')).hexdigest()[:5], 'notice')


def ws(s):
    return re.sub(r'\s+', '', s)


# ------------------------------------------------------------------ 수집/파싱
def collect_versions(reparse):
    pdfs = sorted(glob.glob(os.path.join(BACK, '**', '*.pdf'), recursive=True))
    lines_cache = {p: L.load_lines(p) for p in pdfs}
    model = L.SpaceModel()
    for p, ls in lines_cache.items():
        name, _, _ = L.parse_filename(p)
        model.train([s for s, g in L.split_body(L.clean_lines(ls, name))])
    found = {}
    report = []
    for p in pdfs:
        name, prom, eff = L.parse_filename(p)
        did, kind = doc_identity(name)
        if kind == 'notice' and L.doc_kind(name) != 'notice':
            print(f'[건너뜀] 문서 종류를 알 수 없음: {name}'); continue
        ls = lines_cache[p]
        meta = L.head_meta(ls)
        if not eff: eff = meta.get('eff', '')
        digest = sha1(p)
        sdir = os.path.join(SNAP, did)
        os.makedirs(sdir, exist_ok=True)
        spath = os.path.join(sdir, f'{eff}__{digest[:8]}.json')
        if os.path.exists(spath) and not reparse:
            snap = json.load(open(spath, encoding='utf-8'))
        else:
            arts = L.parse(ls, name, model)
            ok, n, msg = L.verify(ls, name, arts)
            if not ok:
                raise SystemExit(f'[원문 대조 실패] {name}: {msg}')
            snap = {'meta': {'id': did, 'kind': kind, 'name': name, 'promul': meta.get('promul') or prom,
                             'eff': eff, 'pdf': os.path.basename(p), 'sha1': digest, 'chars': n},
                    'arts': arts}
            json.dump(snap, open(spath, 'w', encoding='utf-8'), ensure_ascii=False)
            print(f'[파싱] {name} {eff}: {len(arts)}개 조, 원문 대조 OK ({n:,}자)')
        found.setdefault(did, {})[spath] = snap
    # PDF가 없어진 과거 스냅샷도 이력으로 포함
    for did in os.listdir(SNAP) if os.path.isdir(SNAP) else []:
        for f in glob.glob(os.path.join(SNAP, did, '*.json')):
            if f not in found.setdefault(did, {}):
                found[did][f] = json.load(open(f, encoding='utf-8'))
    return {did: sorted(v.values(), key=lambda s: s['meta']['eff']) for did, v in found.items()}


# ------------------------------------------------------------------ 수동 보정
def apply_overrides(did, arts):
    path = os.path.join(DATA, 'text_overrides.json')
    if not os.path.exists(path): return 0
    ov = json.load(open(path, encoding='utf-8')).get(did, [])
    n = 0
    for o in ov:
        for a in arts:
            if a['no'] != o['art']: continue
            for p in a['paras']:
                for obj in [p] + p['items']:
                    if o['find'] in obj['t']:
                        if ws(o['find']) != ws(o['replace']):
                            raise SystemExit(f'[보정 거부] 글자가 달라지는 보정은 허용되지 않습니다: {o}')
                        obj['t'] = obj['t'].replace(o['find'], o['replace']); n += 1
    return n


# ------------------------------------------------------------------ 개정 비교
def flat(p):
    return p['t'] + ''.join('\n' + it['k'] + ' ' + it['t'] for it in p['items'])


def diff_ops(a, b):
    """공백 차이는 무시하고 글자 단위로 비교, 표시는 변경 전/후 원문 그대로."""
    def strip(s):
        idx = [i for i, ch in enumerate(s) if not ch.isspace()]
        return ''.join(s[i] for i in idx), idx
    A, ia = strip(a); B, ib = strip(b)
    ops = []; pa = pb = 0
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == 'equal':
            eb = ib[j2 - 1] + 1; ops.append(['=', b[pb:eb]]); pb = eb; pa = ia[i2 - 1] + 1
        else:
            if i2 > i1:
                ea = ia[i2 - 1] + 1; ops.append(['-', a[pa:ea]]); pa = ea
            if j2 > j1:
                eb = ib[j2 - 1] + 1; ops.append(['+', b[pb:eb]]); pb = eb
    # 짧은 동일구간(1글자 이하)이 변경 사이에 끼면 하나로 합쳐 읽기 쉽게
    out = []
    for i, o in enumerate(ops):
        if o[0] == '=' and len(ws(o[1])) <= 1 and 0 < i < len(ops) - 1 and ops[i - 1][0] != '=' and ops[i + 1][0] != '=':
            out.append(['-', o[1]]); out.append(['+', o[1]])
        else:
            out.append(o)
    # 인접한 같은 종류 변경은 하나로 묶고, 연속된 변경 묶음은 삭제 -> 추가 순으로 정렬
    merged = []
    for o in out:
        if merged and merged[-1][0] == o[0]:
            merged[-1][1] += o[1]
        else:
            merged.append([o[0], o[1]])
    res, i = [], 0
    while i < len(merged):
        if merged[i][0] == '=':
            res.append(merged[i]); i += 1; continue
        j = i
        while j < len(merged) and merged[j][0] != '=': j += 1
        run = merged[i:j]
        dels = ''.join(t for k, t in run if k == '-'); adds = ''.join(t for k, t in run if k == '+')
        if dels: res.append(['-', dels])
        if adds: res.append(['+', adds])
        i = j
    return res


def art_sig(a):
    return ws(a['title'] + '|' + '|'.join(f"{p['n']}:{flat(p)}" for p in a['paras']))


def compare(old, new):
    om = {a['no']: a for a in old['arts']}
    nm = {a['no']: a for a in new['arts']}
    changes = []
    for a in new['arts']:
        o = om.get(a['no'])
        if o is None:
            changes.append({'no': a['no'], 'title': a['title'], 'kind': 'add'})
        elif art_sig(o) != art_sig(a):
            pn = []
            ob = {p['n']: p for p in o['paras']}; nb = {p['n']: p for p in a['paras']}
            for k in sorted(set(ob) | set(nb), key=lambda x: int(x)):
                x, y = ob.get(k), nb.get(k)
                if x and y and ws(flat(x)) == ws(flat(y)): continue
                pn.append({'pn': k, 'ops': diff_ops(flat(x) if x else '', flat(y) if y else '')})
            ch = {'no': a['no'], 'title': a['title'], 'kind': 'del' if a['deleted'] and not o['deleted'] else 'mod', 'paras': pn}
            if o['title'] != a['title']: ch['tb'] = o['title']
            changes.append(ch)
    for o in old['arts']:
        if o['no'] not in nm:
            changes.append({'no': o['no'], 'title': o['title'], 'kind': 'del'})
    changes.sort(key=lambda c: K.sortkey(c['no']))
    return changes


# ------------------------------------------------------------------ 메인
def main():
    reparse = '--reparse' in sys.argv
    os.makedirs(APP, exist_ok=True); os.makedirs(EXPORT, exist_ok=True)
    versions = collect_versions(reparse)
    if not versions:
        raise SystemExit('BACKDATA에 PDF가 없습니다.')
    docs_cur, revisions = [], []
    for did, vs in versions.items():
        cur = vs[-1]
        n = apply_overrides(did, cur['arts'])
        if n: print(f'[보정] {did}: {n}곳 적용')
        docs_cur.append({'id': did, 'kind': cur['meta']['kind'], 'name': cur['meta']['name'], 'meta': cur['meta'], 'arts': cur['arts']})
        for a, b in zip(vs, vs[1:]):
            ch = compare(a, b)
            revisions.append({'doc': did, 'from': {k: a['meta'][k] for k in ('eff', 'promul')},
                              'to': {k: b['meta'][k] for k in ('eff', 'promul')}, 'changes': ch})
    docs_cur.sort(key=lambda d: (COL[d['kind']], d['name']))
    idx = {d['id']: i for i, d in enumerate(docs_cur)}

    edges, spans = K.build(docs_cur)
    # 수동 연계 보정
    mp = os.path.join(DATA, 'links_manual.json')
    if os.path.exists(mp):
        man = json.load(open(mp, encoding='utf-8'))
        rm = {tuple(r['from']) + tuple(r['to']) for r in man.get('remove', [])}
        edges = [e for e in edges if tuple(e[:6]) not in rm]
        for a in man.get('add', []):
            edges.append(list(a['from']) + list(a['to']) + [a.get('ty', 'c')])
    for d in docs_cur:
        for a in d['arts']:
            for p in a['paras']:
                r = spans.get((d['id'], a['no'], p['n'], 't'))
                if r: p['r'] = [[s, e, idx[x], n] for s, e, x, n in r]
                for i, it in enumerate(p['items']):
                    r = spans.get((d['id'], a['no'], p['n'], str(i)))
                    if r: it['r'] = [[s, e, idx[x], n] for s, e, x, n in r]
    E = [[idx[e[0]], e[1], e[2], idx[e[3]], e[4], e[5], e[6]] for e in edges]

    out_docs = []
    for d in docs_cur:
        m = d['meta']
        out_docs.append({'id': d['id'], 'kind': d['kind'], 'col': COL[d['kind']], 'label': LABEL[d['kind']],
                         'name': d['name'], 'promul': m['promul'], 'eff': m['eff'], 'pdf': m['pdf'], 'n': len(d['arts'])})
    arts = {}
    for d in docs_cur:
        lst = []
        for a in d['arts']:
            lst.append({'no': a['no'], 'title': a['title'], 'ch': a['chapter'], 'sec': a['section'], 'hd': a['heads'],
                        'del': a['deleted'], 'last': a['last'], 'am': a['amend'], 'nt': a['notes'], 'p': a['paras']})
        arts[str(idx[d['id']])] = lst
    rev = [dict(r, doc=idx[r['doc']]) for r in revisions]
    payload = {'built': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'docs': out_docs, 'arts': arts, 'edges': E, 'rev': rev}

    json.dump(payload, open(os.path.join(EXPORT, 'lawgraph.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    html = open(TEMPLATE, encoding='utf-8').read()
    blob = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = html.replace('/*__DATA__*/null', blob)
    open(OUT_HTML, 'w', encoding='utf-8').write(html)

    # 검수 목록(띄어쓰기 불확실 지점)
    lines = []
    for d in docs_cur:
        for a in d['arts']:
            for u in a.get('unc', []):
                lines.append(f"{d['name']} 제{a['no']}조  {u}")
    open(os.path.join(DATA, '검수필요_띄어쓰기.txt'), 'w', encoding='utf-8').write(
        '# 줄바꿈 지점의 띄어쓰기를 모델이 불확실하게 판단한 곳 (␣=띄움 ⌁=붙임). 글자는 PDF와 동일, 공백만 확인 대상.\n'
        '# 틀린 곳은 DATA/text_overrides.json 으로 보정(글자가 달라지는 보정은 거부됨).\n' + '\n'.join(lines))
    cnt = {d['id']: len(d['arts']) for d in docs_cur}
    print('조문 수:', cnt, '| 연계 간선:', len(E), '| 개정비교:', len(revisions), '| 검수 후보:', len(lines))
    print('출력:', OUT_HTML)


if __name__ == '__main__':
    main()
