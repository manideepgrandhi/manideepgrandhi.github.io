#!/usr/bin/env python3
"""Copy the shared header/footer/theme assets (assets/mg-shared.css, mg-shared.js, mg-theme-head.js,
plus the cross-site search mg-search.css / mg-search.js)
into every page that carries mg markers. Single source of truth: this repo's /assets/.

Markers (put them in the page once; the content between them is regenerated):
  <!--mg:head link-->...<!--/mg:head-->     <link> to /assets/mg-shared.css + inline pre-paint theme script
  <!--mg:head inline-->...<!--/mg:head-->   inline <style> + inline pre-paint script (offline apps)
  <!--mg:body link-->...<!--/mg:body-->     <script src="/assets/mg-shared.js">
  <!--mg:body inline-->...<!--/mg:body-->   inline <script> copy (offline apps)

Usage: scripts/sync-mg-shared.py FILE_OR_DIR...   (default: this repo + sibling app repos)
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda n: open(os.path.join(ROOT, 'assets', n), encoding='utf-8').read().strip()
CSS, JS, HEAD = A('mg-shared.css'), A('mg-shared.js'), A('mg-theme-head.js')
SCSS, SJS = A('mg-search.css'), A('mg-search.js')   # cross-site search (button in the bar + dialog)
BLOCK = {
 ('head','link'):   '<link rel="stylesheet" href="/assets/mg-shared.css"><link rel="stylesheet" href="/assets/mg-search.css"><script>'+HEAD+'</script>',
 ('head','inline'): '<style id="mg-shared-css">\n'+CSS+'\n'+SCSS+'\n</style><script>'+HEAD+'</script>',
 ('body','link'):   '<script src="/assets/mg-shared.js"></script><script src="/assets/mg-search.js"></script>',
 ('body','inline'): '<script id="mg-shared-js">\n'+JS+'\n</script><script id="mg-search-js">\n'+SJS+'\n</script>',
}
PAT = re.compile(r'<!--mg:(head|body) (link|inline)-->.*?<!--/mg:\1-->', re.S)
def sync(path):
    s = open(path, encoding='utf-8').read()
    n = PAT.sub(lambda m: '<!--mg:%s %s-->%s<!--/mg:%s-->' % (m[1], m[2], BLOCK[(m[1], m[2])], m[1]), s)
    if n != s:
        open(path, 'w', encoding='utf-8').write(n); print('updated', path)
def walk(t):
    if os.path.isfile(t):
        sync(t); return
    for d, dirs, files in os.walk(t):
        dirs[:] = [x for x in dirs if not x.startswith('.')]
        for f in files:
            if f.endswith('.html'): sync(os.path.join(d, f))
targets = sys.argv[1:] or [ROOT] + [os.path.join(os.path.dirname(ROOT), r) for r in
          ('pg-commands/index.html', 'db-cheatsheet/src/head.html', 'db-cheatsheet/locking.html', 'paisa-diary/index.html')]
for t in targets:
    if os.path.exists(t): walk(t)
print('done. Rebuild db-cheatsheet with ./build.sh after syncing.')
