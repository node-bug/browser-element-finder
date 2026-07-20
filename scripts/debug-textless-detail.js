import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import fs from 'fs'

async function main() {
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments(
    '--headless',
    '--disable-infobars',
    '--disable-notifications',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  );
  chromeOptions.excludeSwitches(['enable-automation']);

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build()

  try {
    await driver.get('https://github.com')
    await driver.sleep(3000)

    const scriptContent = fs.readFileSync('./index.js', 'utf-8')
    await driver.executeScript(`
      ${scriptContent}
      window.ElementFinder = ElementFinder;
    `)

    const result = await driver.executeScript(`
      var finder = window.ElementFinder;
      var tree = finder.getElementInventory();

      // Collect text-less entries grouped by type+frame
      var mismatches = [];
      var matches = 0;

      for (var fi = 0; fi < tree.length; fi++) {
        var frameGroup = tree[fi];
        var elements = frameGroup.elements;

        for (var ei = 0; ei < elements.length; ei++) {
          var entry = elements[ei];
          if (entry.description !== null) continue;

          var type = entry.type;
          var n = entry.index;

          // Get all elements of this type from findElementsByType, same frame
          var typeResult = finder.findElementsByType(type);
          var typeElements = typeResult.elements.filter(function(el) {
            return el.frameIndex === frameGroup.frame;
          });

          // Walk in order and track text-less positions
          var textlessPositions = {};
          var posCounter = 0;
          for (var ti = 0; ti < typeElements.length; ti++) {
            var el = typeElements[ti];
            if (!el.element) continue;

            posCounter++;
            var desc = finder.getElementDescriptor(el);
            if (!desc || !desc.identifiableText) {
              textlessPositions[posCounter] = el.boundingBox;
            }
          }

          if (!(n in textlessPositions)) {
            mismatches.push({
              type: type,
              frame: frameGroup.frame,
              inventoryIndex: n,
              totalOfType: posCounter,
              textlessCount: Object.keys(textlessPositions).length,
              textlessPositions: Object.keys(textlessPositions).map(Number)
            });
          } else {
            matches++;
          }
        }
      }

      return { matches, mismatches };
    `);

    console.log(`Matches: ${result.matches}`);
    console.log(`Mismatches: ${result.mismatches.length}`);
    
    // Show first few mismatches in detail
    for (const m of result.mismatches.slice(0, 10)) {
      console.log(`\n  Type: ${m.type}, frame: ${m.frame}, inventory #N: ${m.inventoryIndex}`);
      console.log(`    Total of type: ${m.totalOfType}, text-less count: ${m.textlessCount}`);
      console.log(`    Text-less positions: [${m.textlessPositions.join(', ')}]`);
    }

  } finally {
    await driver.quit()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
