import WebBrowser from "@nodebug/selenium";

describe("SeleniumBase Demo Page - Checkboxes & Radio Buttons", () => {
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

  describe("Checkboxes", () => {
    it("should check an unchecked checkbox", async () => {
      const before = await browser.checkbox("CheckBox").is.checked();
      expect(before).toBe(false);

      await browser.checkbox("CheckBox").check();
      const after = await browser.checkbox("CheckBox").is.checked();
      expect(after).toBe(true);
    });

    it("should uncheck a pre-checked checkbox", async () => {
      const before = await browser.checkbox("Pre-Check Box").is.checked();
      expect(before).toBe(true);

      await browser.checkbox("Pre-Check Box").uncheck();
      const after = await browser.checkbox("Pre-Check Box").is.checked();
      expect(after).toBe(false);
    });

    it("should toggle multiple checkboxes", async () => {
      // Check individual checkboxes by their labels
      await browser.checkbox("CheckBox").check();
      await browser.checkbox("Pre-Check Box").check();
      
      // Verify both are checked
      const checked1 = await browser.checkbox("CheckBox").is.checked();
      const checked2 = await browser.checkbox("Pre-Check Box").is.checked();
      expect(checked1).toBe(true);
      expect(checked2).toBe(true);
    });
  });

  describe("Radio Buttons", () => {
    it("should switch from RadioButton 1 to RadioButton 2", async () => {
      expect(await browser.radio("RadioButton 1").is.checked()).toBe(true);
      expect(await browser.radio("RadioButton 2").is.checked()).toBe(false);

      await browser.radio("RadioButton 2").set();

      expect(await browser.radio("RadioButton 1").is.checked()).toBe(false);
      expect(await browser.radio("RadioButton 2").is.checked()).toBe(true);
    });
  });
});
