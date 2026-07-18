/**
 * Benchmark: measures getElementInventory() timing on github.com via Selenium.
 *
 * Injects the built IIFE bundle (index.js) into a headless Chrome page, then
 * runs getElementInventory(false) repeatedly and reports per-run and aggregate
 * timings. The Selenium script timeout is raised well above the default 30s
 * because the unoptimized call previously exceeded it. (Passing `false` returns
 * the complete page rather than the default viewport-only scan.)
 *
 * Usage: node scripts/benchmark-github-inventory.js
 */
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TARGET_URL = 'https://github.com/';
const RUNS = 5;
const WARMUP = 1;

const finderSource = readFileSync(join(ROOT, 'index.js'), 'utf8');

async function main() {
  const options = new chrome.Options().addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Raise timeouts: the unoptimized call can exceed the default 30s.
    await driver.manage().setTimeouts({ script: 180000, pageLoad: 60000 });

    console.log(`Navigating to ${TARGET_URL} ...`);
    await driver.get(TARGET_URL);

    // Inject the built finder bundle and expose it on window (the IIFE's
    // `var ElementFinder` is function-scoped inside executeScript, so it must
    // be assigned to window to be reachable from later script evaluations).
    // Concatenate as a plain string (NOT a template literal) so any backticks
    // or ${...} sequences inside the bundle don't corrupt the injected code.
    await driver.executeScript(finderSource + '\nwindow.ElementFinder = ElementFinder;');

    const measure = async () =>
      driver.executeScript(`
        const start = performance.now();
        const tree = ElementFinder.getElementInventory(false);
        const end = performance.now();
        let count = 0;
        let frames = 0;
        for (const group of tree) {
          frames++;
          count += group.elements.length;
        }
        return { ms: end - start, count, frames };
      `);

    // Warm-up run (JIT / first-paint effects).
    for (let i = 0; i < WARMUP; i++) {
      await measure();
    }

    const timings = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await measure();
      timings.push(r.ms);
      console.log(
        `Run ${i + 1}: ${r.ms.toFixed(2)} ms | frames=${r.frames} | elements=${r.count}`,
      );
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const min = Math.min(...timings);
    const max = Math.max(...timings);
    console.log('---');
    console.log(`Average: ${avg.toFixed(2)} ms`);
    console.log(`Min:     ${min.toFixed(2)} ms`);
    console.log(`Max:     ${max.toFixed(2)} ms`);
    console.log(`Elements inventoried: ${timings.length ? '' : ''}${await driver.executeScript('let c=0; for (const g of ElementFinder.getElementInventory(false)) c+=g.elements.length; return c;')}`);
  } finally {
    await driver.quit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
