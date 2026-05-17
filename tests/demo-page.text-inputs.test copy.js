import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - Text Inputs", () => {
  let browser;

  beforeAll(async () => {
    browser = new WebBrowser();
    await browser.start();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    await browser.goto("https://seleniumbase.io/demo_page");
  });

  it("should write to the empty text input field", async () => {
    await browser.textbox("Text Input Field").write("Hello World");
    const value = await browser.textbox("Text Input Field").get.value();
    expect(value).toBe("Hello World");
  });

  it("should write to the textarea", async () => {
    await browser.textbox("Textarea").write("Multi-line\ntext area\ncontent");
    const value = await browser.textbox("Textarea").get.value();
    expect(value).toContain("Multi-line");
  });

  it("should clear the pre-filled text field", async () => {
    const before = await browser.textbox("Pre-Filled Text Field").get.value();
    expect(before).toBe("Text...");

    await browser.textbox("Pre-Filled Text Field").clear();
    await browser.textbox("Pre-Filled Text Field").write("New value");
    const after = await browser.textbox("Pre-Filled Text Field").get.value();
    expect(after).toBe("New value");
  });

  it("should read the read-only text field value", async () => {
    const value = await browser.textbox("Read-Only Text Field").get.value();
    expect(value).toBe("The Color is Green");
  });

  it("should type in the placeholder text field", async () => {
    await browser.textbox("Placeholder Text Field").write("Typed into placeholder");
    const value = await browser.textbox("Placeholder Text Field").get.value();
    expect(value).toBe("Typed into placeholder");
  });
});
