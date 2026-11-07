"""Convert a .dc.html design-canvas template into a Preact render function (plain JS)."""
import re, json, html

VOID = {'img', 'input', 'br', 'link', 'meta', 'hr', 'source', 'area', 'col', 'wbr'}
TOK = re.compile(r'<!--.*?-->|</([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?)*)\s*(/?)>', re.S)
ATTR = re.compile(r'([^\s=/>]+)(?:\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+)))?')
HOLE = re.compile(r'\{\{\s*(.*?)\s*\}\}')


def parse(src):
    root = {'tag': '#root', 'attrs': [], 'kids': []}
    stack = [root]
    pos = 0
    for m in TOK.finditer(src):
        if m.start() > pos:
            stack[-1]['kids'].append(src[pos:m.start()])
        pos = m.end()
        tok = m.group(0)
        if tok.startswith('<!--'):
            continue
        if m.group(1):
            name = m.group(1)
            # pop to matching
            for i in range(len(stack) - 1, 0, -1):
                if stack[i]['tag'] == name:
                    del stack[i:]
                    break
            continue
        name, attrs, selfc = m.group(2), m.group(3) or '', m.group(4)
        al = []
        for a in ATTR.finditer(attrs):
            v = a.group(3) if a.group(3) is not None else (a.group(4) if a.group(4) is not None else a.group(5))
            al.append((a.group(1), None if v is None else html.unescape(v)))
        node = {'tag': name, 'attrs': al, 'kids': []}
        stack[-1]['kids'].append(node)
        if not selfc and name.lower() not in VOID:
            stack.append(node)
    if pos < len(src):
        stack[-1]['kids'].append(src[pos:])
    return root


def expr(e, scope):
    e = e.strip()
    if e in ('true', 'false', 'null') or re.fullmatch(r'-?\d+(\.\d+)?', e):
        return e
    if re.fullmatch(r"'[^']*'", e):
        return e
    parts = e.split('.')
    if parts[0] in scope:
        out = parts[0]
    else:
        out = 'v.' + parts[0]
    for p in parts[1:]:
        out += '?.' + p if re.fullmatch(r'[A-Za-z_$][\w$]*', p) else '?.[' + json.dumps(p) + ']'
    return out


def interp(s, scope, raw_single=True):
    holes = list(HOLE.finditer(s))
    if not holes:
        return json.dumps(s, ensure_ascii=False)
    if raw_single and len(holes) == 1 and holes[0].start() == 0 and holes[0].end() == len(s):
        return expr(holes[0].group(1), scope)
    out, pos = [], 0
    for h in holes:
        if h.start() > pos:
            out.append(json.dumps(s[pos:h.start()], ensure_ascii=False))
        out.append('S(' + expr(h.group(1), scope) + ')')
        pos = h.end()
    if pos < len(s):
        out.append(json.dumps(s[pos:], ensure_ascii=False))
    return '(' + '+'.join(out) + ')'


def text_node(t, scope):
    if not t.strip():
        return None
    lead = re.match(r'\s*', t).group(0)
    trail = re.search(r'\s*$', t).group(0)
    core = re.sub(r'\s+', ' ', t.strip())
    if lead and '\n' not in lead:
        core = ' ' + core
    if trail and '\n' not in trail:
        core = core + ' '
    core = html.unescape(core)
    holes = list(HOLE.finditer(core))
    if not holes:
        return json.dumps(core, ensure_ascii=False)
    return interp(core, scope, raw_single=False)


def kids_js(kids, scope, key_from=None):
    out = []
    for k in kids:
        if isinstance(k, str):
            j = text_node(k, scope)
            if j:
                out.append(j)
        else:
            j = node_js(k, scope, key_from)
            if j:
                out.append(j)
    return out


def node_js(n, scope, key_from=None):
    tag = n['tag']
    A = dict(n['attrs'])
    if tag in ('helmet', 'style', 'script', 'link', 'meta', 'title'):
        return None
    if tag == 'sc-if':
        cond = interp(A.get('value', 'false'), scope)
        ks = kids_js(n['kids'], scope)
        return '(' + cond + ' ? [' + ','.join(ks) + '] : null)'
    if tag == 'sc-for':
        lst = interp(A.get('list', '[]'), scope)
        var = A.get('as', 'item')
        idx = A.get('index-as', '$index')
        sc2 = scope | {var, idx, '$index'}
        ks = kids_js(n['kids'], sc2, key_from=var)
        return '(L(' + lst + ').map((' + var + ', ' + idx + ') => [' + ','.join(ks) + ']))'
    if tag == 'x-dc':
        ks = kids_js(n['kids'], scope)
        return 'h(F, null, ' + ','.join(ks) + ')'
    props = []
    itype = (A.get('type') or '').lower()
    has_key = False
    for name, val in n['attrs']:
        if name.startswith('hint-'):
            continue
        if name == 'key':
            has_key = True
        pname = name
        if name == 'onChange' and tag == 'input' and itype not in ('file', 'checkbox', 'radio'):
            pname = 'onInput'
        if name == 'onChange' and tag == 'textarea':
            pname = 'onInput'
        if val is None:
            js = 'true'
        else:
            js = interp(val, scope)
        if name == 'onSubmit':
            js = 'PV(' + js + ')'
        props.append(json.dumps(pname) + ': ' + js)
    if key_from and not has_key:
        props.append('"key": ' + key_from + '?.key')
    ks = kids_js(n['kids'], scope)
    return 'h(' + json.dumps(tag) + ', {' + ', '.join(props) + '}' + (', ' + ', '.join(ks) if ks else '') + ')'


def convert(xdc_src):
    """xdc_src: full <x-dc>...</x-dc> markup. Returns (head_html, js_function_source)."""
    hm = re.search(r'<helmet>(.*?)</helmet>', xdc_src, re.S)
    head = hm.group(1) if hm else ''
    body = re.sub(r'<helmet>.*?</helmet>', '', xdc_src, flags=re.S)
    root = parse(body)
    ks = kids_js(root['kids'], set())
    fn = 'function TPL(v) { return h(F, null, ' + ', '.join(ks) + '); }'
    return head, fn
