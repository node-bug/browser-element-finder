import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - Dropdowns & Sliders", () => {
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

  describe("Select Dropdown", () => {
    it("should change dropdown selection from 25% to 50%", async () => {
      const before = await browser.dropdown("Select Dropdown").get.text();
      expect(before).toContain("25%");

      await browser.dropdown("Select Dropdown").option("Set to 50%").select();
      const after = await browser.dropdown("Select Dropdown").get.text();
      expect(after).toContain("50%");
    });

    it("should change dropdown to 75%", async () => {
      await browser.dropdown("Select Dropdown").option("Set to 75%").select();
      const selected = await browser.dropdown("Select Dropdown").get.text();
      expect(selected).toContain("75%");
    });

    it("should change dropdown to 100%", async () => {
      await browser.dropdown("Select Dropdown").option("Set to 100%").select();
      const selected = await browser.dropdown("Select Dropdown").get.text();
      expect(selected).toContain("100%");
    });
  });

  describe("Slider", () => {
    it("should interact with the slider control", async () => {
      await browser.slider("Input Slider Control").should.be.visible();
      const value = await browser.slider("Input Slider Control").get.value();
      expect(value).toBeTruthy();
    });
  });

  describe("Progress Bar & Meter", () => {
    it("should verify progress bar is visible", async () => {
      await browser.progressbar("Progress Bar").should.be.visible();
    });

    it("should verify meter is visible", async () => {
      await browser.element("HTML Meter").should.be.visible();
    });
  });
});
