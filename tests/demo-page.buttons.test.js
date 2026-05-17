import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - Buttons & Clicks", () => {
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

  it("should click the green button and verify page state", async () => {
    await browser.button("Click Me (Green)").should.be.visible();
    await browser.button("Click Me (Green)").click();
    // After clicking, the page should still be loaded
    await browser.textbox("Text Input Field").should.be.visible();
  });

  it("should verify the button is visible before clicking", async () => {
    const isVisible = await browser.button("Click Me (Green)").is.visible();
    expect(isVisible).toBe(true);
  });
});
