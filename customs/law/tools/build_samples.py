# -*- coding: utf-8 -*-
"""law_graph.json 에서 예시 조문 클러스터(법→령→칙)를 뽑아 samples.json 생성"""
import json, os, re, difflib
HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, '..', 'DRAFT', 'law_graph.json'), encoding='utf-8'))
SAMPLES = ['10', '38', '97', '100', '106의2', '251']   # 법 조문 번호

L = {a['no']: a for a in G['law']}
D = {a['no']: a for a in G['decree']}
R = {a['no']: a for a in G['rule']}

def strong(child, target_no, kind_prefix, parent_title):
    """위임: 제목이 같거나, 항(①)/본문 첫머리(45자 이내)에서 해당 조문을 근거로 인용.
    인용: 호·목 안에서 단순히 언급하거나 항 중간에서 언급."""
    if difflib.SequenceMatcher(None, child['title'], parent_title).ratio() >= 0.75:
        return True
    pre = re.escape(kind_prefix)
    n = re.escape(target_no)
    for p in child['paras']:
        if p['l'] > 1:
            continue
        m = re.search(pre + r'\s*제' + n + r'조(?!의\d)', p['t'])
        if m and m.start() < 45:
            return True
    return False

def card(kind, a):
    return {'kind': kind, 'no': a['no'], 'title': a['title'], 'chapter': a.get('chapter', ''),
            'section': a.get('section', ''), 'paras': a['paras'], 'deleg': a.get('deleg', [])}

out = []
for n in SAMPLES:
    law = L[n]
    c = {'law': card('law', law), 'decrees': [], 'rules_direct': []}
    used = set()
    for dn in law['decree']:
        d = D[dn]
        item = card('decree', d)
        item['link'] = '위임' if strong(d, n, '법', law['title']) else '인용'
        item['rules'] = []
        for r in G['rule']:
            if dn in r['decree']:
                ri = card('rule', r)
                ri['link'] = '위임' if strong(r, dn, '영', d['title']) else '인용'
                item['rules'].append(ri); used.add(r['no'])
        c['decrees'].append(item)
    for rn in law['rule']:
        if rn not in used:
            r = R[rn]; ri = card('rule', r)
            ri['link'] = '위임' if strong(r, n, '법', law['title']) else '인용'
            c['rules_direct'].append(ri)
    c['decrees'].sort(key=lambda x: (x['link'] != '위임',))
    out.append(c)
json.dump(out, open(os.path.join(HERE, '..', 'DRAFT', 'samples.json'), 'w', encoding='utf-8'), ensure_ascii=False)
with open(os.path.join(HERE, '..', 'DRAFT', '_peek.txt'), 'w', encoding='utf-8') as f:
    for c in out:
        l = c['law']; f.write(f"■ 법 제{l['no']}조 {l['title']} [{l['deleg']}]\n")
        for d in c['decrees']:
            f.write(f"   령 제{d['no']}조 {d['title']} ({d['link']}) {len(d['paras'])}항\n")
            for r in d['rules']: f.write(f"        칙 제{r['no']}조 {r['title']} ({r['link']})\n")
        for r in c['rules_direct']: f.write(f"   칙(직접) 제{r['no']}조 {r['title']} ({r['link']})\n")
