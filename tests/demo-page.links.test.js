import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - Links & Navigation", () => {
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

  it("should verify seleniumbase.com link exists", async () => {
    await browser.link("seleniumbase.com").should.be.visible();
    const href = await browser.link("seleniumbase.com").get.attribute("href");
    expect(href).toBe("https://seleniumbase.com");
  });

  it("should verify GitHub link exists and points to correct URL", async () => {
    await browser.link("SeleniumBase on GitHub").should.be.visible();
    const href = await browser.link("SeleniumBase on GitHub").get.attribute("href");
    expect(href).toContain("github.com/seleniumbase/SeleniumBase");
  });

  it("should verify seleniumbase.io docs link", async () => {
    await browser.link("seleniumbase.io").should.be.visible();
    const href = await browser.link("seleniumbase.io").get.attribute("href");
    expect(href).toBe("https://seleniumbase.io");
  });

  it("should verify demo page self-link", async () => {
    await browser.link("SeleniumBase Demo Page").should.be.visible();
    const href = await browser.link("SeleniumBase Demo Page").get.attribute("href");
    expect(href).toBe("https://seleniumbase.io/demo_page/");
  });

  it("should click a link and navigate to a new page", async () => {
    await browser.link("seleniumbase.com").click();
    // Verify navigation occurred
    const url = await browser.window().get.url();
    expect(url).toContain("seleniumbase.com");

    // Navigate back to demo page
    await browser.back();
    const demoUrl = await browser.window().get.url();
    expect(demoUrl).toContain("demo_page");
  });
});
