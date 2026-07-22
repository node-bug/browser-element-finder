/**
 * Integration tests for animation control functions
 * Runs in a real Chrome browser via Selenium WebDriver.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDriverFixture, loadFixture } from './helpers/driver-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to re-inject the ElementFinder bundle into the current page
async function reinjectFinder(driver) {
  const finderPath = join(__dirname, '..', '..', 'index.js');
  const finderCode = readFileSync(finderPath, 'utf8');
  await driver.executeScript(`
    ${finderCode}
    window.ElementFinder = ElementFinder;
  `);
}

describe('Animation Control Functions', () => {
  const fixture = createDriverFixture({
    url: loadFixture('animations.html'),
    injectFinder: true,
    sleep: 500
  });

  beforeAll(async () => {
    await fixture.setup();
  });

  afterAll(async () => {
    await fixture.teardown();
  });

  // Reload page + re-inject finder before every test to reset animation state
  beforeEach(async () => {
    await fixture.driver.get(fixture.url);
    await reinjectFinder(fixture.driver);
  });

  describe('pauseAnimations', () => {
    it('should return an object with pausedCount', async () => {
      const result = await fixture.driver.executeScript(`
        return ElementFinder.pauseAnimations();
      `);
      expect(result).toBeDefined();
      expect(typeof result.pausedCount).toBe('number');
      expect(result.pausedCount).toBeGreaterThan(0);
      await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations(arguments[0]);
      `, result);
    });

    it('should inject a stylesheet to pause animations', async () => {
      const state = await fixture.driver.executeScript(`
        return ElementFinder.pauseAnimations();
      `);
      const styleSheet = await fixture.driver.executeScript(`
        return document.getElementById('elementfinder-animation-pause');
      `);
      expect(styleSheet).not.toBeNull();
      const tagName = await fixture.driver.executeScript(`
        return arguments[0].tagName;
      `, styleSheet);
      expect(tagName).toBe('STYLE');
      const textContent = await fixture.driver.executeScript(`
        return arguments[0].textContent;
      `, styleSheet);
      expect(textContent).toContain('animation-play-state');
      expect(textContent).toContain('transition-property');
      await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations(arguments[0]);
      `, state);
    });

    it('should pause animations on existing elements', async () => {
      const state = await fixture.driver.executeScript(`
        return ElementFinder.pauseAnimations();
      `);
      const box1State = await fixture.driver.executeScript(`
        const box1 = document.getElementById('box1');
        return {
          animationPlayState: box1.style.animationPlayState,
          transitionProperty: box1.style.transitionProperty
        };
      `);
      expect(box1State.animationPlayState).toBe('paused');
      expect(box1State.transitionProperty).toBe('none');
      await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations(arguments[0]);
      `, state);
    });

    it('should handle multiple calls gracefully', async () => {
      const result = await fixture.driver.executeScript(`
        const result1 = ElementFinder.pauseAnimations();
        const result2 = ElementFinder.pauseAnimations();
        ElementFinder.resumeAnimations(result2);
        ElementFinder.resumeAnimations(result1);
        return { pausedCount1: result1.pausedCount, pausedCount2: result2.pausedCount };
      `);
      expect(result.pausedCount1).toBeGreaterThan(0);
      expect(result.pausedCount2).toBe(0);
    });
  });

  describe('resumeAnimations', () => {
    it('should restore original animation states', async () => {
      const box1State = await fixture.driver.executeScript(`
        const pauseState = ElementFinder.pauseAnimations();
        ElementFinder.resumeAnimations(pauseState);
        const box1 = document.getElementById('box1');
        return {
          animationPlayState: box1.style.animationPlayState,
          transitionProperty: box1.style.transitionProperty
        };
      `);
      expect(box1State.animationPlayState).toBe('');
      expect(box1State.transitionProperty).toBe('');
    });

    it('should remove the injected stylesheet', async () => {
      const styleSheetExists = await fixture.driver.executeScript(`
        const pauseState = ElementFinder.pauseAnimations();
        ElementFinder.resumeAnimations(pauseState);
        return document.getElementById('elementfinder-animation-pause') !== null;
      `);
      expect(styleSheetExists).toBe(false);
    });

    it('should handle null pauseState gracefully', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations(null);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle undefined pauseState gracefully', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations(undefined);
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should handle pauseState without originalStyles gracefully', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations({});
        return 'ok';
      `);
      expect(result).toBe('ok');
    });

    it('should work without argument (pop from stack)', async () => {
      const result = await fixture.driver.executeScript(`
        const box1 = document.getElementById('box1');
        const before = box1.style.animationPlayState;
        ElementFinder.pauseAnimations();
        const paused = box1.style.animationPlayState;
        ElementFinder.resumeAnimations();
        const after = box1.style.animationPlayState;
        return { before, paused, after };
      `);
      expect(result.paused).toBe('paused');
      expect(result.after).toBe('');
    });

    it('should handle empty stack gracefully when called without argument', async () => {
      const result = await fixture.driver.executeScript(`
        ElementFinder.resumeAnimations();
        return 'ok';
      `);
      expect(result).toBe('ok');
    });
  });

  describe('pause and resume cycle', () => {
    it('should allow multiple pause/resume cycles', async () => {
      const result = await fixture.driver.executeScript(`
        const box1 = document.getElementById('box1');

        // First cycle
        const state1 = ElementFinder.pauseAnimations();
        const paused1 = box1.style.animationPlayState;
        ElementFinder.resumeAnimations(state1);
        const after1 = box1.style.animationPlayState;

        // Second cycle
        const state2 = ElementFinder.pauseAnimations();
        const paused2 = box1.style.animationPlayState;
        ElementFinder.resumeAnimations(state2);
        const after2 = box1.style.animationPlayState;

        return { paused1, after1, paused2, after2 };
      `);
      expect(result.paused1).toBe('paused');
      expect(result.after1).toBe('');
      expect(result.paused2).toBe('paused');
      expect(result.after2).toBe('');
    });
  });
});
