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

      // Collect all text-less entries from inventory
      var textlessEntries = [];
      for (var fi = 0; fi < tree.length; fi++) {
        var frameGroup = tree[fi];
        for (var ei = 0; ei < frameGroup.elements.length; ei++) {
          var entry = frameGroup.elements[ei];
          if (entry.description === null) {
            textlessEntries.push({
              frame: frameGroup.frame,
              type: entry.type,
              index: entry.index,
              inViewport: entry.inViewport
            });
          }
        }
      }

      // For each type that has text-less entries, count how many text-less elements findElementsByType returns
      var typesWithTextless = {};
      for (var i = 0; i < textlessEntries.length; i++) {
        var e = textlessEntries[i];
        if (!typesWithTextless[e.type]) {
          typesWithTextless[e.type] = [];
        }
        typesWithTextless[e.type].push(e);
      }

      var analysis = {};
      for (var type in typesWithTextless) {
        var entries = typesWithTextless[type];
        var maxIndex = 0;
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].index > maxIndex) maxIndex = entries[i].index;
        }

        // Get all elements of this type via findElementsByType
        var typeResult = finder.findElementsByType(type);
        
        // Count text-less per frame
        var textlessByFrame = {};
        for (var ti = 0; ti < typeResult.elements.length; ti++) {
          var el = typeResult.elements[ti];
          if (!el.element) continue;
          
          var desc = finder.getElementDescriptor(el);
          if (!desc || !desc.identifiableText) {
            var frameIdx = el.frameIndex;
            if (!textlessByFrame[frameIdx]) textlessByFrame[frameIdx] = 0;
            textlessByFrame[frameIdx]++;
          }
        }

        analysis[type] = {
          inventoryCount: entries.length,
          maxInventoryIndex: maxIndex,
          findElementsByTypeTotal: typeResult.elements.length,
          textlessByFrame: textlessByFrame,
          framesUsed: [...new Set(entries.map(function(e) { return e.frame; }))]
        };
      }

      return {
        totalTextlessEntries: textlessEntries.length,
        analysis: analysis
      };
    `);

    console.log(`Total text-less entries in inventory: ${result.totalTextlessEntries}`);
    console.log('\n=== Per-type analysis ===');
    for (const [type, data] of Object.entries(result.analysis)) {
      console.log(`\nType: ${type}`);
      console.log(`  Inventory count: ${data.inventoryCount}`);
      console.log(`  Max inventory #N index: ${data.maxInventoryIndex}`);
      console.log(`  findElementsByType total: ${data.findElementsByTypeTotal}`);
      console.log(`  Text-less by frame (findElementsByType): ${JSON.stringify(data.textlessByFrame)}`);
      console.log(`  Frames used in inventory: ${JSON.stringify(data.framesUsed)}`);
    }

  } finally {
    await driver.quit()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
