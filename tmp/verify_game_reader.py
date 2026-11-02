from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root=Path(r'D:/AAA-SZ/留学学科教育')
out=root/'tmp/html-reader-katex'
html=root/'output/reviews/在线博弈论文_网页阅读版.html'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
    errors=[];remote=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://**/*',lambda r:(remote.append(r.request.url),r.abort()))
    page.route('http://**/*',lambda r:(remote.append(r.request.url),r.abort()))
    page.goto(html.as_uri(),wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    counts=page.evaluate('''() => ({math:document.querySelectorAll('.katex').length,
      displays:document.querySelectorAll('.equation').length,
      errors:document.querySelectorAll('.katex-error').length,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
      placeholders:document.body.innerText.includes('MATHREADERPLACEHOLDER'),
      rawMathDelimiters:document.querySelector('#reading').innerText.includes('$$'),
      fontStatus:document.fonts.status,
      reviewReports:document.querySelectorAll('.review-report').length})''')
    assert counts['math']==103 and counts['displays']==14 and counts['errors']==0
    assert not counts['horizontalOverflow'] and not counts['placeholders'] and not counts['rawMathDelimiters']
    assert counts['fontStatus']=='loaded' and counts['reviewReports']==3
    page.screenshot(path=str(out/'desktop.png'))
    equations=page.locator('.equation')
    for i in range(equations.count()):
        equations.nth(i).screenshot(path=str(out/f'equation-{i+1:02d}.png'))
    page.locator('#larger').click()
    assert page.evaluate("getComputedStyle(document.querySelector('main')).fontSize")=='19px'
    page.locator('#review-2 summary').click()
    assert page.locator('#review-2').get_attribute('open') is not None
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('window.scrollTo(0,0)')
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.screenshot(path=str(out/'mobile.png'))
    equations.nth(13).scroll_into_view_if_needed()
    page.screenshot(path=str(out/'mobile-matrix.png'))
    assert not remote and not errors
    (out/'browser-verification.json').write_text(json.dumps({'passed':True,'desktop':counts,'mobile_page_overflow':False,'offline_remote_requests':remote,'script_errors':errors,'controls_verified':['font-size','expand-review']},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':True,**counts,'remote_requests':len(remote),'script_errors':errors},ensure_ascii=False))
    browser.close()
