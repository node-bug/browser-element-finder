import Browser from "@nodebug/selenium";

/**
 * Test to validate Text Input Field on SeleniumBase demo page
 */
async function testTextInputField() {
  const browser = new Browser();
  
  try {
    // Start the browser session
    await browser.start();
    
    // Navigate to the SeleniumBase demo page
    await browser.goto("https://seleniumbase.io/demo_page");
    
    // Validate that the page has loaded successfully
    await browser.element("body").isDisplayed();
    
    // Locate the Text Input Field
    const textInput = browser.textbox("TextInput");
    
    // Validate that the text input field is visible
    const isVisible = await textInput.isVisible();
    if (!isVisible) {
      throw new Error("Text input field is not visible");
    }
    
    // Validate that the text input field is enabled
    const isEnabled = await textInput.isEnabled();
    if (!isEnabled) {
      throw new Error("Text input field is not enabled");
    }
    
    // Validate that the text input field is displayed
    await textInput.isDisplayed();
    
    // Test 1: Check initial state of the text input field
    const initialText = await textInput.getValue();
    console.log("Initial text input value:", initialText);
    
    // Test 2: Enter text into the text input field
    const testText = "Hello SeleniumBase!";
    await textInput.write(testText);
    
    // Test 3: Verify the text was entered correctly
    const enteredText = await textInput.getValue();
    if (enteredText !== testText) {
      throw new Error(`Expected "${testText}", but got "${enteredText}"`);
    }
    
    // Test 4: Clear the text input field
    await textInput.clear();
    
    // Test 5: Verify the text input field is now empty
    const clearedText = await textInput.getValue();
    if (clearedText !== "") {
      throw new Error(`Expected empty text, but got "${clearedText}"`);
    }
    
    // Test 6: Test typing with special characters
    const specialText = "Test with special chars: !@#$%^&*()_+-={}[]|\\:;\"'<>?,./";
    await textInput.write(specialText);
    const specialEnteredText = await textInput.getValue();
    if (specialEnteredText !== specialText) {
      throw new Error(`Expected "${specialText}", but got "${specialEnteredText}"`);
    }
    
    // Test 7: Test text input field attributes
    const inputType = await textInput.get.attribute("type");
    console.log("Input type:", inputType);
    
    const inputId = await textInput.get.attribute("id");
    console.log("Input ID:", inputId);
    
    const inputName = await textInput.get.attribute("name");
    console.log("Input name:", inputName);
    
    // Test 8: Test text input field properties
    const isReadOnly = await textInput.getProperty("readOnly");
    console.log("Is read-only:", isReadOnly);
    
    const isDisabled = await textInput.getProperty("disabled");
    console.log("Is disabled:", isDisabled);
    
    // Test 9: Test text input field focus
    await textInput.focus();
    const isFocused = await textInput.isFocused();
    console.log("Is focused:", isFocused);
    
    // Test 10: Test text input field blur
    await textInput.blur();
    const isBlurred = await textInput.isFocused();
    console.log("Is blurred:", isBlurred);
    
    // Test 11: Test text input field with overwrite
    const overwriteText = "Overwritten text";
    await textInput.overwrite(overwriteText);
    const overwrittenText = await textInput.getValue();
    if (overwrittenText !== overwriteText) {
      throw new Error(`Expected "${overwriteText}", but got "${overwrittenText}"`);
    }
    
    // Test 12: Test text input field with multiple clicks
    await textInput.clear();
    await textInput.multipleClick(3);
    const multipleClickText = await textInput.getValue();
    console.log("Text after multiple clicks:", multipleClickText);
    
    // Test 13: Test text input field with double click
    await textInput.write("Double click test");
    await textInput.doubleClick();
    const doubleClickText = await textInput.getValue();
    console.log("Text after double click:", doubleClickText);
    
    console.log("All validations passed for Text Input Field!");
    
  } catch (error) {
    console.error("Test failed:", error.message);
    throw error;
  } finally {
    // Close the browser
    await browser.close();
  }
}

testTextInputField()