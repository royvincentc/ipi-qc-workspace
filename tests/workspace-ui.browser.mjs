import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Render the production CSS cascade against the shared dialog and report control contracts.
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
const styles = await Promise.all([...main.matchAll(/import '\.\/(.*?\.css)'/g)].map(match =>
  readFile(new URL('../src/' + match[1], import.meta.url), 'utf8')));
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--no-proxy-server']});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    await page.route('**/*', route => route.abort());
    await page.setContent(`<html class="workspace-motion-paused" data-theme="dark"><body>
      <div class="app app-workspace"><div class="main-wrapper"><div class="workspace-content"><main class="route-stage"><div class="reports-workbench reports-editor">
        <section class="panel padded"><div class="section-heading"><h2>Accupoint + SPCMY</h2></div>
        <p>PF2 · Filling. Save each method's results, then generate all session DOCX files from Review &amp; download.</p>
        <div class="swab-method-switcher">
          <button class="button secondary swab-method"><strong>Accupoint</strong><span>Rapid swab · RLU</span><span class="swab-method-status">3 items to complete</span></button>
          <button class="button primary swab-method" aria-current="page"><strong>SPCMY</strong><span>Traditional swab · SPC &amp; MY</span><span class="swab-method-status">Editing · 6 items to complete</span></button>
        </div></section></div></main></div></div>
        <div class="account-menu-anchor" style="position:absolute"><div class="account-menu" role="menu">Account</div></div><div class="toast">Draft saved</div>
        <dialog class="workspace-dialog sample-search-dialog"><div class="section-heading"><h2>Find a sample</h2><button>Close</button></div>
          <div class="cmd-palette"><input aria-label="Find a sample anywhere" autofocus></div>
        </dialog>
      </div></body></html>`);
    for (const css of styles) await page.addStyleTag({content: css});
    await page.evaluate(() => document.querySelector('dialog').showModal());
    for (const selector of ['dialog', '.cmd-palette', '.account-menu', '.toast']) {
      assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).opacity), '1', `${selector} must remain visible with motion paused`);
    }
    assert.equal(await page.locator('dialog').evaluate(el => getComputedStyle(el, '::backdrop').animationName), 'none');
    await page.getByLabel('Find a sample anywhere').fill('ML-EM');
    assert.equal(await page.getByLabel('Find a sample anywhere').inputValue(), 'ML-EM');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
    const layout = await page.locator('.swab-method-switcher').evaluate(group => {
      const buttons = [...group.querySelectorAll('button')];
      return {
        overflow: group.scrollHeight > group.clientHeight || group.scrollWidth > group.clientWidth,
        clipped: buttons.some(button => [...button.children].some(child => {
          const outer = button.getBoundingClientRect(), inner = child.getBoundingClientRect();
          return inner.top < outer.top || inner.bottom > outer.bottom || inner.left < outer.left || inner.right > outer.right;
        })),
        stacked: buttons[1].getBoundingClientRect().top > buttons[0].getBoundingClientRect().top,
      };
    });
    assert.equal(layout.overflow, false, 'method switcher must not become a tiny scroll area');
    assert.equal(layout.clipped, false, 'method names, descriptions and status must fit');
    assert.equal(layout.stacked, width < 640, 'methods must stack on mobile');
    assert.ok(await page.locator('section').evaluate(el => el.clientWidth > innerWidth / 2), 'fixture must use the real workspace content width');
    await page.locator('.account-menu').evaluate(el => el.hidden = true);
    await page.locator('.toast').evaluate(el => el.hidden = true);
    await mkdir('output/playwright', {recursive: true});
    await page.locator('section').screenshot({path: `output/playwright/swab-methods-${width}.png`});
    await page.evaluate(() => document.documentElement.classList.remove('workspace-motion-paused'));
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.evaluate(() => document.querySelector('dialog').showModal());
    assert.equal(await page.locator('dialog').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.close();
    console.log(`PASS ${width}px: paused popups, editable search, Escape, method layout, reduced motion`);
  }
} finally {
  await browser.close();
}
