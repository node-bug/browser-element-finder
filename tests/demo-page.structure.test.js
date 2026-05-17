import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - Page Structure & Content", () => {
  let browser;

  beforeAll(async () => {
    browser = new WebBrowser();
    await browser.start();
  });

  afterAll(async () => {
    await browser.close();
  });

  it("should load the demo page successfully", async () => {
    await browser.goto("https://seleniumbase.io/demo_page");
    const title = await browser.window().get.title();
    expect(title).toBe("Web Testing Page");
  });

  it("should verify page headings", async () => {
    await browser.goto("https://seleniumbase.io/demo_page");
    await browser.heading("Demo Page").should.be.visible();
    await browser.heading("SeleniumBase").should.be.visible();
    await browser.heading("Automation Practice").should.be.visible();
  });

  it("should verify all form elements are present on the page", async () => {
    await browser.goto("https://seleniumbase.io/demo_page");

    // Text inputs
    await browser.textbox("Text Input Field").should.be.visible();
    await browser.textbox("Textarea").should.be.visible();
    await browser.textbox("Pre-Filled Text Field").should.be.visible();
    await browser.textbox("Read-Only Text Field").should.be.visible();
    await browser.textbox("Placeholder Text Field").should.be.visible();

    // Button
    await browser.button("Click Me (Green)").should.be.visible();

    // Slider & Progress
    await browser.slider("Input Slider Control").should.be.visible();
    await browser.progressbar("Progress Bar").should.be.visible();

    // Dropdown
    await browser.combobox("Select Dropdown").should.be.visible();

    // Checkboxes
    await browser.checkbox("CheckBox").should.be.visible();
    await browser.checkbox("Pre-Check Box").should.be.visible();

    // Radio buttons
    await browser.radio("RadioButton 1").should.be.visible();
    await browser.radio("RadioButton 2").should.be.visible();

    // Links
    await browser.link("seleniumbase.com").should.be.visible();
    await browser.link("SeleniumBase on GitHub").should.be.visible();
  });

  it("should verify paragraph text content", async () => {
    await browser.goto("https://seleniumbase.io/demo_page");
    const paragraph = browser.paragraph("This Text is Green");
    await paragraph.isDisplayed();
    const text = await paragraph.getText();
    expect(text).toBe("This Text is Green");
  });

  it("should verify SVG image is displayed", async () => {
    await browser.goto("https://seleniumbase.io/demo_page");
    const svg = browser.image("HTML SVG with rect");
    await svg.isDisplayed();
  });
});
