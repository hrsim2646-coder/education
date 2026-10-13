# -*- coding: utf-8 -*-
"""관세법 법/령/칙 PDF -> 조문 단위 JSON + 연계(위임) 그래프.
사용: python -I parse_law.py  (BACKDATA의 PDF를 읽어 DRAFT/law_graph.json 생성)
"""
import fitz, glob, json, re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.join(HERE, '..', 'BACKDATA')
OUT = os.path.join(HERE, '..', 'DRAFT', 'law_graph.json')

CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
NOISE = re.compile(r'^법제처\s+\d+\s+국가법령정보센터\s*$')
ART = re.compile(r'^제(\d+)조(?:의(\d+))?\((.+?)\)(?=\s|$|[①-⑳])\s*(.*)$')
CHAP = re.compile(r'^\s*제(\d+)(?:의\d+)?(장|절|관)\s+(.+?)\s*(<.*>)?\s*$')
TAG = re.compile(r'\s*<(?:개정|신설|삭제|본조신설|전문개정|제목개정)[^>]*>')
ENDS_SPACE = set('는은을를할한의에및로며면등고')

def kind_of(path):
    n = os.path.basename(path)
    if '시행규칙' in n: return 'rule'
    if '시행령' in n: return 'decree'
    return 'law'

def level_of(line):
    if line[:1] in CIRC: return 1
    if re.match(r'^\d{1,3}(?:의\d+)?\.\s', line): return 2
    if re.match(r'^[가-하]\.\s', line): return 3
    return 0

def join(prev, nxt):
    if not prev: return nxt
    a, b = prev[-1], nxt[0]
    if a in ',.;:)」”' or b in '「“(' or b.isdigit() or a in ENDS_SPACE:
        return prev + ' ' + nxt
    return prev + nxt

def load_lines(path):
    """PDF -> [(줄텍스트, 오른쪽여백까지의 거리gap)]"""
    doc = fitz.open(path)
    lines = []
    for p in doc:
        pl = []
        for b in p.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                t = ''.join(sp['text'] for sp in l['spans'])
                pl.append((t, l['bbox'][2]))
        mx = max([x for t, x in pl if len(t) > 30] or [0])
        lines += [(t, mx - x) for t, x in pl]
    return lines

PUNCT = re.compile(r'[,.;:()<>\[\]「」“”‘’ⓐ]')
def build_vocab(all_lines):
    from collections import Counter
    c = Counter()
    for lines in all_lines:
        for t, g in lines:
            tk = t.split()
            for w in tk[1:-1]:
                w = PUNCT.sub('', w)
                if len(w) >= 2: c[w] += 1
    return c

def need_space(prev_t, gap, nxt, vocab):
    """줄바꿈 지점에 띄어쓰기가 있었는지 추정"""
    if gap < 3.5:                       # 공백이 들어갈 폭이 없음 -> 단어 중간
        return False
    a = PUNCT.sub('', prev_t.split()[-1]) if prev_t.split() else ''
    b = PUNCT.sub('', nxt.split()[0]) if nxt.split() else ''
    if a and b and vocab.get(a + b, 0) > 0 and vocab.get(b, 0) == 0:
        return False
    if b and vocab.get(b, 0) == 0 and len(b) <= 2:
        return False
    return True

def parse(lines, vocab):
    arts, cur, chapter, sect = [], None, '', ''
    title_names = {'관세법', '관세법 시행령', '관세법 시행규칙'}
    for raw, full in lines:
        s = raw.strip()
        if not s or NOISE.match(s) or s in title_names or s.startswith('[시행 ') or '044-215' in s:
            continue
        if s.startswith('부칙'):
            break
        m = CHAP.match(s)
        if m and not ART.match(s):
            if m.group(2) == '장': chapter, sect = f'제{m.group(1)}장 {m.group(3)}', ''
            else: sect = f'제{m.group(1)}{m.group(2)} {m.group(3)}'
            continue
        m = ART.match(s)
        if m:
            no = m.group(1) + (f'의{m.group(2)}' if m.group(2) else '')
            cur = {'no': no, 'title': m.group(3), 'chapter': chapter, 'section': sect,
                   'lines': [], 'notes': []}
            arts.append(cur)
            if m.group(4): cur['lines'].append((m.group(4), full))
            continue
        if cur is None: continue
        if s.startswith('['):
            cur['notes'].append(s); continue
        cur['lines'].append((s, full))
    for a in arts:
        paras = []
        for ln, full in a.pop('lines'):
            ln = TAG.sub('', ln).strip()
            if not ln: continue
            lv = level_of(ln)
            if lv == 0 and paras:
                paras[-1]['t'] += (' ' if need_space(paras[-1]['t'], paras[-1]['_f'], ln, vocab) else '') + ln
                paras[-1]['_f'] = full
            else:
                paras.append({'l': lv, 't': ln, '_f': full})
        for p_ in paras:
            p_.pop('_f', None)
            p_['t'] = re.sub(r'\s*<[^<>]*(?:\d{4}\.\s*\d+\.\s*\d+\.)[^<>]*>', '', p_['t']).strip()
        a['paras'] = paras
        a['text'] = ' '.join(p['t'] for p in paras)
    return arts

# ---- 참조 추출 ----
NO = r'제(\d+)조(?:의(\d+))?'
CHAIN = re.compile(r'\s*(?:제\d+항)?(?:제\d+호)?(?:[가-하]목)?\s*(?:[,ㆍ]|및|또는|부터|내지)\s*' + NO)

def collect(text, pat):
    """pat(정규식, 접두어) 뒤에 오는 '제N조(의M)' 와 쉼표·및·또는으로 이어진 조문번호를 모두 수집"""
    out = []
    for m in re.finditer(pat + r'\s*' + NO, text):
        out.append(m.group(1) + (f'의{m.group(2)}' if m.group(2) else ''))
        pos = m.end()
        while True:
            c = CHAIN.match(text, pos)
            if not c: break
            out.append(c.group(1) + (f'의{c.group(2)}' if c.group(2) else ''))
            pos = c.end()
    return out

def law_refs(text):   # 령/칙 본문이 가리키는 '법' 조문
    pat = r'(?:(?<!같은 )(?<![가-힣])법|「관세법」)'
    return sorted(set(collect(text, pat)), key=sortkey)

def decree_refs(text):  # 칙 본문이 가리키는 '령' 조문
    pat = r'(?:(?<![가-힣])영|「관세법 시행령」)'
    return sorted(set(collect(text, pat)), key=sortkey)

def sortkey(n):
    a, _, b = n.partition('의')
    return (int(a), int(b or 0))

def delegation(text):
    d = []
    if re.search(r'대통령령으로\s*정|대통령령에\s*따라', text): d.append('령')
    if re.search(r'(?:기획재정부|재정경제부|[가-힣]{2,6}부)령으로\s*정', text): d.append('칙')
    if re.search(r'고시', text): d.append('고시')
    return d

def main():
    data = {}
    files = glob.glob(os.path.join(BACK, '*.pdf'))
    loaded = {f: load_lines(f) for f in files}
    vocab = build_vocab(loaded.values())
    for f in files:
        data[kind_of(f)] = parse(loaded[f], vocab)
    law = {a['no']: a for a in data['law']}
    dec = {a['no']: a for a in data['decree']}
    rul = {a['no']: a for a in data['rule']}
    for a in data['law']:
        a['deleg'] = delegation(a['text'])
        a['decree'], a['rule'], a['rule_via'] = [], [], []
    for a in data['decree']:
        a['law'] = [n for n in law_refs(a['text']) if n in law]
        a['deleg'] = delegation(a['text'])
        for n in a['law']: law[n]['decree'].append(a['no'])
    for a in data['rule']:
        a['law'] = [n for n in law_refs(a['text']) if n in law]
        a['decree'] = [n for n in decree_refs(a['text']) if n in dec]
        a['deleg'] = delegation(a['text'])
        for n in a['law']: law[n]['rule'].append(a['no'])
    for a in data['law']:
        s = set()
        for d in a['decree']:
            for r in data['rule']:
                if d in r['decree'] and r['no'] not in a['rule']: s.add(r['no'])
        a['rule_via'] = sorted(s, key=sortkey)
        a['decree'] = sorted(set(a['decree']), key=sortkey)
        a['rule'] = sorted(set(a['rule']), key=sortkey)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print({k: len(v) for k, v in data.items()})

if __name__ == '__main__':
    main()
