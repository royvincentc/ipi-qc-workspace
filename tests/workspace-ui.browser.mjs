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
  for (const theme of ['light', 'dark']) {
    for (const [width, height, rows] of [[1009, 925, 6], [1440, 900, 40], [390, 844, 40], [390, 600, 40], [844, 390, 40]]) {
      const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
      await page.route('**/*', route => route.abort());
      await page.setContent(`<html data-theme="${theme}"><body>
        <div class="app app-workspace"><main class="route-stage"><div class="reports-workbench reports-setup">
          <dialog class="workspace-dialog wide report-confirmation-dialog">
            <div class="section-heading"><h2>Confirm equipment and method tables</h2><button class="button secondary small">Close</button></div>
            <div class="report-confirmation"><div class="report-confirmation-body">
              <p><strong>ML-EM-26-0516 · Example sample with a long equipment review name</strong></p>
              <p>The selected points use the approved standards below. Each method keeps separate measurements; no results are inferred from equipment quantities.</p>
              <div class="table-scroll"><table><thead><tr><th>Method / point</th><th>Parameter</th><th>Standard</th></tr></thead><tbody>
                ${Array.from({length: rows}, (_, index) => `<tr><td>ACCUPOINT · Mixing Tank ${index + 1}</td><td>Neogen Accupoint (Rapid Testing)</td><td>Not more than 100 RLU</td></tr>`).join('')}
              </tbody></table></div><div class="error" role="alert">Could not create drafts. Please try again.</div>
            </div><div class="form-footer"><button class="button secondary">Back to setup</button><button class="button primary">Confirm &amp; create session drafts</button></div></div>
          </dialog>
        </div></main></div></body></html>`);
      for (const css of styles) await page.addStyleTag({content: css});
      await page.evaluate(() => document.querySelector('dialog').showModal());
      const geometry = await page.locator('dialog').evaluate(dialog => {
        const box = dialog.getBoundingClientRect(), footer = dialog.querySelector('.form-footer');
        return {
          inViewport: box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth,
          clipped: [...footer.querySelectorAll('button')].some(button => {
            const rect = button.getBoundingClientRect();
            return rect.top < box.top || rect.bottom > box.bottom || rect.left < box.left || rect.right > box.right || rect.height < 44;
          }),
          margin: getComputedStyle(footer).margin,
          bounds: {dialog: box.toJSON(), buttons: [...footer.querySelectorAll('button')].map(button => button.getBoundingClientRect().toJSON())},
          pageOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(geometry.inViewport, true, 'confirmation must fit the viewport');
      assert.equal(geometry.clipped, false, `both footer actions must remain fully visible: ${JSON.stringify(geometry.bounds)}`);
      assert.equal(geometry.margin, '0px', 'confirmation footer must not inherit page-form margins');
      assert.equal(geometry.pageOverflow, false, 'confirmation must not overflow the page');
      const footerBefore = await page.locator('.form-footer').boundingBox();
      await page.locator('.report-confirmation-body').evaluate(body => body.scrollTop = body.scrollHeight);
      assert.deepEqual(await page.locator('.form-footer').boundingBox(), footerBefore, 'scrolling review content must keep actions stationary');
      await page.getByRole('button', {name: 'Back to setup'}).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.getByRole('button', {name: 'Confirm & create session drafts'}).evaluate(button => button === document.activeElement), true);
      await page.screenshot({path: `output/playwright/report-confirmation-${theme}-${width}x${height}.png`});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').evaluate(dialog => dialog.open), false);
      await page.close();
      console.log(`PASS confirmation ${theme} ${width}x${height}: visible actions, contained scrolling, keyboard, Escape`);
    }
  }
} finally {
  await browser.close();
}
