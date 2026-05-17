import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - iFrames", () => {
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

  it("should verify iframe with image is present", async () => {
    await browser.element("Image in iFrame").should.be.visible();
  });

  it("should verify iframe text content", async () => {
    await browser.element("iFrame Text").should.be.visible();
  });

  it("should verify iframe with checkbox is present", async () => {
    await browser.element("CheckBox in iFrame").should.be.visible();
  });
});
