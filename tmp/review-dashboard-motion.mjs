import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

const out = 'tmp/redesign-review/motion';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'msedge', headless:true});
const context = await browser.newContext({
  viewport:{width:1440,height:1000}, reducedMotion:'no-preference',
  recordVideo:{dir:out,size:{width:1440,height:1000}},
});
await context.addInitScript(() => {
  if (localStorage.getItem('ipi.reception.motion') === null) localStorage.setItem('ipi.reception.motion','on');
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const trace = () => page.locator('.operations-flow-trace').evaluate(el => {
  const style = getComputedStyle(el);
  return {offset:style.strokeDashoffset,state:style.animationPlayState,opacity:style.opacity,name:style.animationName};
});
const noOverflow = async () => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  if (page.viewportSize().width >= 768) assert.equal(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().width),54);
};
await page.goto('http://localhost:5173/');
await page.getByRole('button',{name:'Pause animations',exact:true}).waitFor();
await page.waitForFunction(() => document.querySelector('.reception-table-scroll')?.getAttribute('aria-busy') === 'false');
await page.evaluate(() => document.fonts.ready);
const first = await trace();
await page.waitForTimeout(350);
const second = await trace();
assert.notEqual(first.offset,second.offset,'workflow must visibly advance');
await noOverflow();
await page.screenshot({path:`${out}/dashboard-motion-desktop.png`});
await page.getByRole('button',{name:'Pause animations',exact:true}).click();
const paused = await trace();
await page.waitForTimeout(250);
assert.equal((await trace()).offset,paused.offset,'pause must stop the workflow');
assert.equal(paused.state,'paused');
assert.equal(await page.getByRole('button',{name:'Replay',exact:true}).isDisabled(),true);
await page.getByRole('button',{name:'Play animations',exact:true}).click();
await page.getByRole('button',{name:'Replay',exact:true}).click();
assert.equal((await trace()).state,'running');
await page.getByRole('button',{name:'Previous month',exact:true}).click();
await page.waitForFunction(() => document.querySelector('.reception-total-number')?.textContent?.includes('September') && document.querySelector('.reception-table-scroll')?.getAttribute('aria-busy') === 'false');
assert.match(await page.locator('.reception-total-number').innerText(),/7/);
assert.equal(await page.locator('.operations-mix-bars i').count(),7);
await page.getByRole('button',{name:'Replay',exact:true}).click();
await page.waitForTimeout(1500);
await noOverflow();
await page.screenshot({path:`${out}/dashboard-motion-populated.png`});
await page.setViewportSize({width:390,height:844});
await noOverflow();
await page.getByRole('button',{name:'Replay',exact:true}).click();
await page.waitForTimeout(1400);
await page.screenshot({path:`${out}/dashboard-motion-mobile.png`,fullPage:true});
await page.emulateMedia({reducedMotion:'reduce'});
await page.getByText('System reduced motion is on',{exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'Play animations',exact:true}).isDisabled(),true);
assert.equal((await trace()).name,'none');
assert.equal((await trace()).opacity,'0');
assert.equal(await page.locator('.operations-flow-node').first().evaluate(el=>getComputedStyle(el,'::after').animationPlayState),'paused');
await page.emulateMedia({reducedMotion:'no-preference'});
await page.getByRole('button',{name:'Pause animations',exact:true}).click();
const saved = await page.evaluate(() => localStorage.getItem('ipi.reception.motion'));
assert.equal(saved,'off');
await page.reload();
await page.getByRole('button',{name:'Play animations',exact:true}).waitFor();
assert.equal((await trace()).state,'paused');
await page.getByRole('button',{name:'Play animations',exact:true}).click();
assert.deepEqual(errors,[]);
const video = page.video();
await context.close();
await video.saveAs(`${out}/dashboard-motion.webm`);
await browser.close();
await writeFile(`${out}/checks.json`,JSON.stringify({
  checks:['advancing SVG trace','pause freezes animation','replay restarts graphic and chart','populated month with seven real demo records','390px and 1440px no page overflow','reduced-motion disables graphical movement','pause preference survives reload'],
  first,second,paused,errors,
},null,2));
console.log('Dashboard motion: seven checks passed; desktop/mobile captures and video saved.');
