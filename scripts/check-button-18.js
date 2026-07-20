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

    // Get inventory and find button with index 18 that has null description
    const result = await driver.executeScript(`
      var inv = ElementFinder.getElementInventory()
      var frame = inv[0] // main frame
      
      // Find all buttons with null description (text-less)
      var textlessButtons = []
      for (var i = 0; i < frame.elements.length; i++) {
        var el = frame.elements[i]
        if (el.type === 'button' && el.description === null) {
          textlessButtons.push({
            arrayIndex: i,
            elementIndex: el.index,
            inViewport: el.inViewport,
            formState: el.formState
          })
        }
      }
      
      // Also get ALL buttons with their positions and viewport status
      var allButtons = []
      for (var j = 0; j < frame.elements.length; j++) {
        var b = frame.elements[j]
        if (b.type === 'button') {
          allButtons.push({
            arrayIndex: j,
            elementIndex: b.index,
            description: b.description,
            inViewport: b.inViewport,
            formState: b.formState
          })
        }
      }
      
      // Find button at index 18 specifically
      var button18 = null
      for (var k = 0; k < frame.elements.length; k++) {
        if (frame.elements[k].type === 'button' && frame.elements[k].index === 18) {
          button18 = {
            arrayIndex: k,
            elementIndex: frame.elements[k].index,
            description: frame.elements[k].description,
            inViewport: frame.elements[k].inViewport,
            formState: frame.elements[k].formState
          }
        }
      }
      
      // Get viewport info
      var viewportInfo = {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }
      
      return {
        button18: button18,
        textlessButtons: textlessButtons,
        allButtons: allButtons,
        viewportInfo: viewportInfo,
        totalElements: frame.elements.length
      }
    `)

    console.log('=== Button with index 18 ===')
    console.log(JSON.stringify(result.button18, null, 2))

    console.log('\n=== All text-less buttons (null description) ===')
    for (const b of result.textlessButtons) {
      console.log(`  arrayIndex=${b.arrayIndex}, elementIndex=${b.elementIndex}, inViewport=${b.inViewport}`)
    }

    console.log('\n=== Viewport ===')
    console.log(JSON.stringify(result.viewportInfo, null, 2))

    // Now use findElements to get the actual DOM references for buttons and check their positions
    const buttonsCheck = await driver.executeScript(`
      var finder = window.ElementFinder
      var allBtns = finder.findElementsByType('button')
      
      var details = []
      for (var i = 0; i < allBtns.elements.length; i++) {
        var el = allBtns.elements[i]
        if (el.element) {
          var rect = el.element.getBoundingClientRect()
          var style = window.getComputedStyle(el.element)
          
          // Check actual visibility in viewport
          var vpLeft = 0, vpTop = 0
          var vpRight = window.innerWidth
          var vpBottom = window.innerHeight
          
          var overlapsViewport = !(
            rect.right < vpLeft ||
            rect.left > vpRight ||
            rect.bottom < vpTop ||
            rect.top > vpBottom
          )
          
          details.push({
            findIndex: i,
            tag: el.tagName,
            boundingBox: {
              x: Math.round(el.boundingBox.x),
              y: Math.round(el.boundingBox.y),
              width: Math.round(el.boundingBox.width),
              height: Math.round(el.boundingBox.height)
            },
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            overlapsViewport: overlapsViewport,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            ariaLabel: el.element.getAttribute('aria-label'),
            className: (el.element.className || '').toString().substring(0, 80),
            id: el.element.id || null
          })
        }
      }
      return details
    `)

    // Find buttons that are reported as inViewport=true but have no text
    console.log('\n=== Buttons with inViewport=true (from bounding box check) ===')
    for (const b of buttonsCheck) {
      const inVp = !(b.rect.top < 0 || b.rect.left < 0 || 
                     b.rect.bottom > result.viewportInfo.innerHeight || 
                     b.rect.right > result.viewportInfo.innerWidth)
      if (inVp && !b.ariaLabel) {
        console.log(`  #${b.findIndex}: tag=${b.tag}, rect=(${b.rect.left},${b.rect.top}) ${b.rect.width}x${b.rect.height}, class="${b.className.substring(0,60)}", id="${b.id}"`)
      }
    }

    // Specifically look for the Play button and its inventory status
    console.log('\n=== Searching for Play button in findElements ===')
    const playBtns = await driver.executeScript(`
      var finder = window.ElementFinder
      var result = finder.findElements('button', 'Play')
      return result.elements.map((el, i) => ({
        index: i,
        boundingBox: el.boundingBox,
        tagName: el.tagName,
        frameIndex: el.frameIndex
      }))
    `)
    console.log(JSON.stringify(playBtns, null, 2))

    // Check descriptor for each button to see which one maps to inventory index 18
    console.log('\n=== getElementDescriptor for buttons near Play ===')
    const descriptors = await driver.executeScript(`
      var finder = window.ElementFinder
      var allBtns = finder.findElementsByType('button')
      var playDescriptors = []
      
      for (var i = 0; i < allBtns.elements.length; i++) {
        if (allBtns.elements[i].element) {
          var desc = finder.getElementDescriptor(allBtns.elements[i].element)
          var className = allBtns.elements[i].element.className || ''
          if (typeof className === 'string' && className.toLowerCase().includes('play')) {
            playDescriptors.push({
              btnIndex: i,
              descriptor: desc,
              className: className.substring(0, 80),
              ariaLabel: allBtns.elements[i].element.getAttribute('aria-label'),
              boundingBox: allBtns.elements[i].boundingBox
            })
          }
        }
      }
      return playDescriptors
    `)
    console.log(JSON.stringify(descriptors, null, 2))

  } finally {
    await driver.quit()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
