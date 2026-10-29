#!/usr/bin/env python3
"""Build /search-index.json for the cross-site search (assets/mg-search.js).

What it indexes: every published page that carries the shared top bar (<!--mg:body ...--> marker) in this repo
and the sibling site repos (db-cheatsheet, pg-commands, paisa-diary), split into one entry per h1-h4 section.

Privacy: Sticky Pad notes, Paisa Diary entries, travel trips and anything else the apps keep in the browser are
never indexed. Pages in APP_PAGES are read from their source HTML only (never run), so they can only contribute
the text that ships in the repo. Pages that are rendered (to pick up JS-built content such as the cheat-sheet cards)
run in headless Chrome with a brand-new empty profile, so no localStorage / saved data exists to leak.

Usage:
  scripts/build-search-index.py                 # sibling repos next to this one, output ./search-index.json
  scripts/build-search-index.py --repos DIR     # directory that holds all four repo checkouts
  scripts/build-search-index.py --check         # exit 1 if the index would change (no write)
Needs Python 3.8+ and Google Chrome (CHROME env var or google-chrome on PATH). Without Chrome, every page is
parsed statically (JS-built content is then missing) and a warning is printed.
"""
import argparse, functools, gzip, html, http.server, json, os, re, shutil, socketserver, subprocess, sys, tempfile, threading
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = [  # (group name, url prefix); first match wins
    ('DB Cheat Sheet', '/db-cheatsheet/'), ('pg-commands', '/pg-commands/'), ('Paisa Diary', '/paisa-diary/'),
    ('Blog', '/blog/'), ('Sticky Pad', '/sticky/'), ('Sticky Pad', '/sticky-gist/'), ('Travel', '/travel/'),
    ('Tools', '/tools/'), ('Projects', '/projects/'), ('Home', '/')]
MOUNTS = {'/db-cheatsheet/': 'db-cheatsheet', '/pg-commands/': 'pg-commands', '/paisa-diary/': 'paisa-diary'}
APP_PAGES = {'/sticky/', '/sticky-gist/', '/travel/', '/paisa-diary/'}       # private-data apps: source HTML only
STATIC_PAGES = {'/tools/'}   # rendered values there (clocks, random UUIDs) would change the index every night
SKIP_PATHS = re.compile(r'^/blog/tags/|^/db-cheatsheet/src/|^/sticky-gist/')  # tag lists; build input; gist copy duplicates /sticky/
TITLE_ONLY = {'/blog/'}                                                       # post list: every post is indexed itself
SKIP_TAGS = {'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'button', 'select', 'option', 'textarea',
             'input', 'nav', 'footer', 'dialog', 'iframe', 'head', 'datalist', 'output'}
SKIP_IDS = {'mg-bar', 'mg-foot', 'mg-foot-slot', 'mg-search', 'toast'}
# containers the private apps fill with the user's own data (defence in depth: they are empty in source HTML)
PRIVATE_IDS = {'list', 'days', 'breakdown', 'rules', 'upnext', 'recUpcoming', 'recActive', 'recWeek', 'recMonthly',
               'todayTotal', 'weekTotal', 'monthTotalNow', 'bdTotal', 'trips', 'tl', 'wish'}
SKIP_CLASS = re.compile(r'(^|\s)(sheet|toast|mg-s-ov|unote|pn|orig|back)(\s|$)')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
BLOCK = {'p', 'div', 'li', 'tr', 'td', 'th', 'dt', 'dd', 'section', 'article', 'header', 'main', 'aside', 'pre', 'br',
         'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'blockquote', 'figcaption', 'label', 'summary', 'details'}
TEXT_MAX, CODE_MAX = 420, 260

def slug(t):  # must match slug() in assets/mg-search.js
    t = re.sub(r'-+$', '', re.sub(r'^-+|-+$', '', re.sub(r'[^a-z0-9]+', '-', t.lower()))[:60])
    return 's-' + (t or 'section')

def norm(s):
    return re.sub(r'\s+', ' ', s).strip()

class Node:
    __slots__ = ('tag', 'a', 'kids', 'parent')
    def __init__(s, tag, a, parent): s.tag, s.a, s.kids, s.parent = tag, a, [], parent

class Tree(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.root = Node('#root', {}, None); s.cur = s.root
    def handle_starttag(s, t, a):
        n = Node(t, dict((k, v if v is not None else '') for k, v in a), s.cur); s.cur.kids.append(n)
        if t not in VOID: s.cur = n
    def handle_startendtag(s, t, a):
        s.cur.kids.append(Node(t, dict((k, v or '') for k, v in a), s.cur))
    def handle_endtag(s, t):
        n = s.cur
        while n is not s.root and n.tag != t: n = n.parent
        if n is not s.root: s.cur = n.parent
    def handle_data(s, d):
        if d: s.cur.kids.append(d)

def parse(src):
    p = Tree(); p.feed(src); p.close(); return p.root

def find(n, pred):
    if isinstance(n, str): return None
    if pred(n): return n
    for k in n.kids:
        r = find(k, pred)
        if r: return r

def text_of(n, code=False):
    if isinstance(n, str): return n
    if n.tag in SKIP_TAGS and n.tag != 'button': return ''
    out = ''.join(text_of(k) for k in n.kids)
    return out + (' ' if n.tag in BLOCK else '')

def skipped(n, private=False):
    a = n.a
    return (n.tag in SKIP_TAGS or 'hidden' in a or 'data-hide' in a or a.get('aria-hidden') == 'true'
            or a.get('id') in SKIP_IDS or (private and a.get('id') in PRIVATE_IDS) or SKIP_CLASS.search(a.get('class', '')) or a.get('role') == 'dialog'
            or 'display:none' in a.get('style', '').replace(' ', ''))

def chunks(root, anchor_for, used_ids, private=False):
    """Walk the body in document order; start a chunk at every h1-h4. -> [(anchor, heading, text, code)]
    Hidden tab panels with an id (e.g. /tools/#json) are indexed too, linked by the panel id the page opens from the hash."""
    out, cur = [], {'a': '', 'h': '', 't': [], 'c': []}
    def flush():
        t, c = norm(' '.join(cur['t'])), norm(' '.join(cur['c']))
        if cur['h'] or t or c: out.append((cur['a'], cur['h'], t, c))
    def walk(n, in_pre, panel):
        if isinstance(n, str):
            (cur['c'] if in_pre else cur['t']).append(n); return
        if n.a.get('role') == 'tabpanel' and n.a.get('id') and 'hidden' in n.a and not private:
            flush(); panel = n.a['id']; cur.update(a=panel, h='', t=[], c=[])
            for k in n.kids: walk(k, in_pre, panel)
            flush(); cur.update(a='', h='', t=[], c=[]); return
        if skipped(n, private): return
        if n.tag in ('h1', 'h2', 'h3', 'h4'):
            h = norm(text_of(n))
            if h:
                flush()
                hid = n.a.get('id')
                if not hid:
                    b = slug(h); hid, i = b, 2
                    while hid in used_ids: hid, i = '%s-%d' % (b, i), i + 1
                    used_ids.add(hid)
                cur.update(a=panel or anchor_for(n, hid, h), h=h, t=[], c=[]); return
        for k in n.kids: walk(k, in_pre or n.tag == 'pre', panel)
        if n.tag in BLOCK and not in_pre: cur['t'].append(' ')
    body = find(root, lambda x: x.tag == 'body') or root
    walk(body, False, None); flush()
    if len(out) > 1 and not out[0][1] and out[0][0] == '': out = out[1:]   # chrome before the first heading
    return out

def all_ids(n, acc):
    if isinstance(n, str): return acc
    if n.a.get('id'): acc.add(n.a['id'])
    for k in n.kids: all_ids(k, acc)
    return acc

def page_title(root, path):
    t = find(root, lambda x: x.tag == 'title')
    t = norm(text_of(t)) if t else ''
    t = re.split(r'\s+[·|–—]\s+', t)[0] if t else ''
    return t or path

def clip(s, n):
    if len(s) <= n: return s
    s = s[:n]; i = s.rfind(' ')
    return s[:i if i > n * .7 else n]

# ---------------------------------------------------------------- serving + rendering
def server(repos):
    class H(http.server.SimpleHTTPRequestHandler):
        def translate_path(self, p):
            p = p.split('?', 1)[0].split('#', 1)[0]
            for pre, d in MOUNTS.items():
                if p.startswith(pre): return os.path.join(repos, d, p[len(pre):])
            return os.path.join(repos, os.path.basename(ROOT), p.lstrip('/'))
        def log_message(self, *a): pass
    class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
    s = S(('127.0.0.1', 0), functools.partial(H, directory=repos))
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

def find_chrome():
    for c in [os.environ.get('CHROME'), 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']:
        if c and shutil.which(c): return shutil.which(c)

def render(chrome, url, settle=1.5):
    """Load url in headless Chrome (fresh empty profile) and return the DOM after scripts ran.
    Talks the DevTools protocol over --remote-debugging-pipe (stdlib only; --dump-dom can hang on some Chrome builds)."""
    prof = tempfile.mkdtemp(prefix='mg-idx-')  # empty profile: nothing saved by the user can exist here
    r0, w0 = os.pipe(); r1, w1 = os.pipe()
    def fds():  # child: Chrome reads commands on fd 3 and writes replies on fd 4
        a, b = os.dup(r0), os.dup(w1); os.dup2(a, 3); os.dup2(b, 4)
    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-extensions',
                             '--password-store=basic', '--user-data-dir=' + prof, '--remote-debugging-pipe',
                             # offline render: web fonts/CDNs are not needed for text and can stall page load
                             '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', 'about:blank'],
                            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            preexec_fn=fds, close_fds=False)
    os.close(r0); os.close(w1)
    out, inp, buf, seq = os.fdopen(w0, 'wb', buffering=0), os.fdopen(r1, 'rb', buffering=0), b'', [0]
    import select, time
    deadline = time.time() + 60
    def send(method, params=None, session=None):
        seq[0] += 1; m = {'id': seq[0], 'method': method, 'params': params or {}}
        if session: m['sessionId'] = session
        out.write(json.dumps(m).encode() + b'\0'); return seq[0]
    def recv(until):
        nonlocal buf
        while True:
            while b'\0' in buf:
                raw, buf = buf.split(b'\0', 1); m = json.loads(raw)
                if until(m): return m
            left = deadline - time.time()
            if left <= 0 or not select.select([inp], [], [], left)[0]: raise RuntimeError('chrome timed out on ' + url)
            chunk = inp.read(1 << 20)
            if not chunk: raise RuntimeError('chrome exited on ' + url)
            buf += chunk
    def call(method, params=None, session=None):
        i = send(method, params, session); m = recv(lambda m: m.get('id') == i)
        if 'error' in m: raise RuntimeError('%s: %s' % (method, m['error']))
        return m.get('result', {})
    try:
        tid = call('Target.createTarget', {'url': 'about:blank'})['targetId']
        sid = call('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        call('Page.enable', None, sid)
        call('Page.navigate', {'url': url}, sid)
        recv(lambda m: m.get('method') == 'Page.loadEventFired' and m.get('sessionId') == sid)
        time.sleep(settle)
        res = call('Runtime.evaluate', {'expression': 'document.documentElement.outerHTML', 'returnByValue': True}, sid)
        return res['result']['value']
    finally:
        try: send('Browser.close')
        except Exception: pass
        try: proc.wait(10)
        except Exception: proc.kill()
        for f in (out, inp):
            try: f.close()
            except Exception: pass
        shutil.rmtree(prof, ignore_errors=True)

# ---------------------------------------------------------------- discovery
def discover(repos):
    pages = []
    def add(base_dir, prefix):
        for d, dirs, files in os.walk(base_dir):
            dirs[:] = sorted(x for x in dirs if not x.startswith('.') and x != 'node_modules')
            for f in sorted(files):
                if not f.endswith('.html'): continue
                fp = os.path.join(d, f); rel = os.path.relpath(fp, base_dir).replace(os.sep, '/')
                url = prefix + rel
                url = url[:-len('index.html')] if url.endswith('/index.html') or url == prefix + 'index.html' else url
                if SKIP_PATHS.search(url): continue
                with open(fp, encoding='utf-8') as fh: s = fh.read()
                if '<!--mg:body' not in s: continue
                pages.append((url, fp, s))
    add(os.path.join(repos, os.path.basename(ROOT)), '/')
    for pre, d in MOUNTS.items():
        if os.path.isdir(os.path.join(repos, d)): add(os.path.join(repos, d), pre)
        else: print('warning: missing repo', d, file=sys.stderr)
    return pages

def site_of(url):
    for i, (name, pre) in enumerate(SITES):
        if url.startswith(pre): return name

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--repos', default=os.path.dirname(ROOT))
    ap.add_argument('--out', default=os.path.join(ROOT, 'search-index.json')); ap.add_argument('--check', action='store_true')
    ap.add_argument('--no-chrome', action='store_true'); o = ap.parse_args()
    repos = os.path.abspath(o.repos); chrome = None if o.no_chrome else find_chrome()
    if not chrome: print('warning: Chrome not found; JS-built content will be missing', file=sys.stderr)
    srv = server(repos); base = 'http://127.0.0.1:%d' % srv.server_address[1]
    found = discover(repos)
    entries = []   # (url, title, anchor, heading, text, code)

    def plain_anchor(n, hid, h): return hid

    def do_page(item):
        url, fp, src = item
        static = not chrome or url in APP_PAGES or url in STATIC_PAGES or url.startswith('/blog/')
        doc = src if static else render(chrome, base + url)
        root = parse(doc)
        title = page_title(root, url)
        if url in TITLE_ONLY: return [(url, title, '', '', '', '')]
        if url == '/pg-commands/' and chrome: return pg_commands(root)
        out = []
        for a, h, t, c in chunks(root, plain_anchor, all_ids(root, set()), url in APP_PAGES):
            out.append((url, title, a, h, t, c))
        return out

    def pg_commands(root):
        # one rendered view per route (#group/tool); recipe and security cards get #route?q=<card title>
        side = find(root, lambda x: x.a.get('id') == 'side')
        routes = []
        def collect(n):
            if isinstance(n, str): return
            if n.tag == 'a' and n.a.get('data-r'): routes.append((n.a['data-r'], norm(text_of(n))))
            for k in n.kids: collect(k)
        collect(side)
        def one(r):
            key, label = r
            rt = parse(render(chrome, base + '/pg-commands/#' + key))
            def anchor(n, hid, h):
                if n.tag == 'h4' and find_up(n, lambda x: x.a.get('id') in ('cards', 'scards')): return key + '?q=' + quote(h, safe='')
                return key
            res, first = [], True
            for a, h, t, c in chunks(rt, anchor, all_ids(rt, set())):
                if first and not h: first = False; continue   # page chrome before the first heading
                res.append(('/pg-commands/', label, a, h, t, c)); first = False
            return res
        with ThreadPoolExecutor(4) as ex: return [e for part in ex.map(one, routes) for e in part]

    with ThreadPoolExecutor(4) as ex:
        for part in ex.map(do_page, found): entries.extend(part)
    srv.shutdown()

    # ---- compact, deduplicated output
    site_names, pages, page_ix, rows, seen = [], [], {}, [], set()
    for url, title, a, h, t, c in entries:
        name = site_of(url)
        t, c = clip(t, TEXT_MAX), clip(c, CODE_MAX)
        if h == title: h = ''
        k = (name, h, t, c) if url == '/pg-commands/' else (url, a, h, t, c)
        if k in seen or not (h or t or c or a == ''): continue
        seen.add(k)
        if name not in site_names: site_names.append(name)
        pk = (url, title)
        if pk not in page_ix:
            page_ix[pk] = len(pages)
            pages.append([site_names.index(name), url, title])
        rows.append([page_ix[pk], a, h, t, c])
    sites = [[n, next(p for m, p in SITES if m == n)] for n in site_names]
    data = {'v': 1, 'sites': sites, 'pages': pages, 'e': rows}
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    raw = js.encode(); gz = len(gzip.compress(raw, 9))
    print('%d sites, %d pages, %d entries, %.1f KB raw, %.1f KB gzip' % (len(sites), len(pages), len(rows), len(raw) / 1024, gz / 1024))
    for i, (n, _) in enumerate(sites):
        print('  %-15s %4d pages %5d entries' % (n, sum(1 for p in pages if p[0] == i), sum(1 for r in rows if pages[r[0]][0] == i)))
    old = open(o.out, encoding='utf-8').read() if os.path.exists(o.out) else None
    if old == js + '\n': print('unchanged'); return 0
    if o.check: print('index would change'); return 1
    with open(o.out, 'w', encoding='utf-8') as f: f.write(js + '\n')
    print('wrote', o.out); return 0

def find_up(n, pred):
    n = n.parent
    while n is not None:
        if pred(n): return n
        n = n.parent

if __name__ == '__main__':
    sys.exit(main())
