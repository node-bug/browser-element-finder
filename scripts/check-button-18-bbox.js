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

    // Find the button at inventory array index 533 (text-less button #18) and get its actual DOM info
    const result = await driver.executeScript(`
      var finder = window.ElementFinder
      
      // Get all buttons via findElementsByType to match inventory order
      var allBtns = finder.findElementsByType('button')
      
      // The text-less button #18 is at inventory array index 533.
      // We need to figure out which findElements index corresponds to it.
      // Let's enumerate ALL buttons and check their descriptors + bounding boxes
      
      var buttonDetails = []
      for (var i = 0; i < allBtns.elements.length; i++) {
        if (!allBtns.elements[i].element) continue
        
        var el = allBtns.elements[i].element
        var desc = finder.getElementDescriptor(el)
        var rect = el.getBoundingClientRect()
        var style = window.getComputedStyle(el)
        
        buttonDetails.push({
          findIndex: i,
          descriptor: desc,
          hasText: desc && desc.identifiableText !== null,
          text: desc ? desc.identifiableText : null,
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          boundingBox: allBtns.elements[i].boundingBox,
          ariaLabel: el.getAttribute('aria-label'),
          className: (el.className || '').toString().substring(0, 100),
          id: el.id || null,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        })
      }
      
      // Get viewport info
      var vp = {
        w: window.innerWidth,
        h: window.innerHeight
      }
      
      // Find which buttons are text-less and in viewport
      var textlessInViewport = []
      var textlessCounter = 0
      for (var j = 0; j < buttonDetails.length; j++) {
        var b = buttonDetails[j]
        if (!b.hasText) {
          textlessCounter++
          var inVp = !(b.rect.top < 0 || b.rect.left < 0 || 
                       b.rect.bottom > vp.h || b.rect.right > vp.w)
          if (inVp) {
            textlessInViewport.push({
              findIndex: b.findIndex,
              textlessIndex: textlessCounter,
              rect: b.rect,
              className: b.className.substring(0, 80),
              id: b.id,
              ariaLabel: b.ariaLabel,
              display: b.display,
              visibility: b.visibility,
              opacity: b.opacity
            })
          }
        }
      }
      
      return {
        buttonDetails: buttonDetails,
        viewport: vp,
        textlessInViewport: textlessInViewport,
        totalButtons: buttonDetails.length,
        totalTextless: textlessCounter
      }
    `)

    console.log('=== Viewport ===')
    console.log(JSON.stringify(result.viewport, null, 2))
    console.log(`\nTotal buttons: ${result.totalButtons}`)
    console.log(`Total text-less buttons: ${result.totalTextless}`)

    console.log('\n=== Text-less buttons reported as inViewport=true ===')
    for (const b of result.textlessInViewport) {
      console.log(`  findIndex=${b.findIndex}, textlessIndex=${b.textlessIndex}`)
      console.log(`    rect=(${b.rect.left},${b.rect.top}) ${b.rect.width}x${b.rect.height}`)
      console.log(`    class="${b.className}"`)
      console.log(`    id="${b.id}", aria-label="${b.ariaLabel}"`)
      console.log(`    display=${b.display}, visibility=${b.visibility}, opacity=${b.opacity}`)
      console.log()
    }

    // Now specifically check: which button is text-less #18?
    console.log('\n=== Finding text-less button #18 ===')
    const btn18 = await driver.executeScript(`
      var finder = window.ElementFinder
      var allBtns = finder.findElementsByType('button')
      
      var textlessCounter = 0
      var target = null
      
      for (var i = 0; i < allBtns.elements.length; i++) {
        if (!allBtns.elements[i].element) continue
        
        var el = allBtns.elements[i].element
        var desc = finder.getElementDescriptor(el)
        
        if (!desc || !desc.identifiableText) {
          textlessCounter++
          if (textlessCounter === 18) {
            var rect = el.getBoundingClientRect()
            var style = window.getComputedStyle(el)
            target = {
              findIndex: i,
              textlessIndex: textlessCounter,
              rect: {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              boundingBox: allBtns.elements[i].boundingBox,
              className: (el.className || '').toString().substring(0, 120),
              id: el.id || null,
              ariaLabel: el.getAttribute('aria-label'),
              outerHTML: el.outerHTML.substring(0, 300),
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity
            }
          }
        }
      }
      
      return target
    `)

    console.log('Text-less button #18 details:')
    console.log(JSON.stringify(btn18, null, 2))

    // Verify viewport overlap
    if (btn18) {
      const r = btn18.rect
      const vp = result.viewport
      const overlaps = !(r.top < 0 || r.left < 0 || r.bottom > vp.h || r.right > vp.w)
      console.log(`\nViewport check: rect(${r.left},${r.top}) ${r.width}x${r.height} vs viewport ${vp.w}x${vp.h}`)
      console.log(`  top=${r.top} >= 0? ${r.top >= 0}`)
      console.log(`  left=${r.left} >= 0? ${r.left >= 0}`)
      console.log(`  bottom=${r.top + r.height} <= ${vp.h}? ${(r.top + r.height) <= vp.h}`)
      console.log(`  right=${r.left + r.width} <= ${vp.w}? ${(r.left + r.width) <= vp.w}`)
      console.log(`  OVERLAPS VIEWPORT: ${overlaps}`)
    }

  } finally {
    await driver.quit()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
