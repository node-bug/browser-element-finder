/**
 * Shared test utilities for integration tests
 * Reduces boilerplate and provides consistent validation patterns
 */

/**
 * Filter elements to only include those with valid element references
 * @param {Array} elements - Array of element objects from findElements result
 * @returns {Array} Filtered array with element property defined
 */
function filterMainElements(elements) {
  return elements.filter(e => e.element);
}

/**
 * Validate that an element has a data-test-id attribute
 * @param {*} element - Selenium WebElement
 * @returns {Promise<string>} The data-test-id value
 */
async function validateHasTestDataId(element) {
  const testDataId = await element.getAttribute('data-test-id');
  if (!testDataId) {
    throw new Error('Element does not have data-test-id attribute');
  }
  return testDataId;
}

/**
 * Assert element count matches expected
 * @param {Array} elements - Filtered elements array
 * @param {number} expected - Expected count
 */
function assertElementCount(elements, expected) {
  if (elements.length !== expected) {
    throw new Error(`Expected ${expected} elements, got ${elements.length}`);
  }
}

/**
 * Get attribute values from multiple elements
 * @param {Array} elements - Filtered elements array
 * @param {string} attribute - Attribute name to retrieve
 * @returns {Promise<Array>} Array of attribute values
 */
async function getElementAttributes(elements, attribute) {
  return Promise.all(elements.map(e => e.element.getAttribute(attribute)));
}

/**
 * Create a test suite for a fixture that tests both type and attribute search
 * @param {string} fixtureName - Name of the fixture file (without .html)
 * @param {Object} typeTests - Tests for findElementsByType
 * @param {Object} attributeTests - Tests for findElementsByAttribute
 * @returns {Function} Test suite function
 */
function createFixtureTestSuite(fixtureName, typeTests = {}, attributeTests = {}) {
  return async function(driver) {
    // Type-based tests
    if (typeTests.findElementsByType) {
      for (const [type, expected] of Object.entries(typeTests.findElementsByType)) {
        const result = await driver.executeScript(`
          return ElementFinder.findElementsByType('${type}');
        `);
        const mainElements = filterMainElements(result.elements);
        if (typeof expected === 'number') {
          assertElementCount(mainElements, expected);
        }
      }
    }

    // Attribute-based tests
    if (attributeTests.findElementsByAttribute) {
      for (const [text, expected] of Object.entries(attributeTests.findElementsByAttribute)) {
        const result = await driver.executeScript(`
          return ElementFinder.findElementsByAttribute('${text}');
        `);
        const mainElements = filterMainElements(result.elements);
        if (typeof expected === 'number') {
          assertElementCount(mainElements, expected);
        }
      }
    }
  };
}

export {
  filterMainElements,
  validateHasTestDataId,
  assertElementCount,
  getElementAttributes,
  createFixtureTestSuite
};