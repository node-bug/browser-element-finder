/**
 * Unit tests for animation control functions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  pauseAnimations,
  resumeAnimations
} from '../../src/element-finder.js';

describe('Animation Control Functions', () => {
  let window;
  let document;

  beforeAll(() => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @keyframes slide {
              from { transform: translateX(0); }
              to { transform: translateX(100px); }
            }
            @keyframes fade {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animated {
              animation: slide 2s infinite;
              transition: all 0.3s ease;
            }
            .fade-box {
              animation: fade 1s ease-in-out;
            }
          </style>
        </head>
        <body>
          <div id="box1" class="animated">Animated Box</div>
          <div id="box2" class="fade-box">Fade Box</div>
          <div id="box3">Static Box</div>
          <button id="btn1" class="animated">Animated Button</button>
        </body>
      </html>
    `;

    const dom = new JSDOM(html, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
    });

    window = dom.window;
    document = window.document;

    global.document = document;
    global.Node = window.Node;
    global.window = window;
  });

  afterAll(() => {
    window.close();
    delete global.window;
    delete global.document;
    delete global.Node;
  });

  describe('pauseAnimations', () => {

    it('should return an object with pausedCount', () => {
      const result = pauseAnimations();
      expect(result).toBeDefined();
      expect(typeof result.pausedCount).toBe('number');
      expect(result.pausedCount).toBeGreaterThan(0);
      resumeAnimations(result);
    });

    it('should inject a stylesheet to pause animations', () => {
      const state = pauseAnimations();
      const styleSheet = document.getElementById('elementfinder-animation-pause');
      expect(styleSheet).not.toBeNull();
      expect(styleSheet.tagName).toBe('STYLE');
      expect(styleSheet.textContent).toContain('animation-play-state');
      expect(styleSheet.textContent).toContain('transition-property');
      resumeAnimations(state);
    });

    it('should pause animations on existing elements', () => {
      const state = pauseAnimations();
      const box1 = document.getElementById('box1');
      expect(box1.style.animationPlayState).toBe('paused');
      expect(box1.style.transitionProperty).toBe('none');
      resumeAnimations(state);
    });

    it('should handle multiple calls gracefully', () => {
      const result1 = pauseAnimations();
      // Second call should not throw and should return valid state
      const result2 = pauseAnimations();
      expect(result1.pausedCount).toBeGreaterThan(0);
      // Second call returns 0 because elements are already paused
      // (idempotent behavior - no need to re-track already-paused elements)
      expect(result2.pausedCount).toBe(0);
      // Resume both to clean up
      resumeAnimations(result2);
      resumeAnimations(result1);
    });
  });

  describe('resumeAnimations', () => {

    it('should restore original animation states', () => {
      const pauseState = pauseAnimations();
      resumeAnimations(pauseState);

      const box1 = document.getElementById('box1');
      expect(box1.style.animationPlayState).toBe('');
      expect(box1.style.transitionProperty).toBe('');
    });

    it('should remove the injected stylesheet', () => {
      const pauseState = pauseAnimations();
      resumeAnimations(pauseState);

      const styleSheet = document.getElementById('elementfinder-animation-pause');
      expect(styleSheet).toBeNull();
    });

    it('should handle null pauseState gracefully', () => {
      expect(() => resumeAnimations(null)).not.toThrow();
    });

    it('should handle undefined pauseState gracefully', () => {
      expect(() => resumeAnimations(undefined)).not.toThrow();
    });

    it('should handle pauseState without originalStyles gracefully', () => {
      expect(() => resumeAnimations({})).not.toThrow();
    });

    it('should work without argument (pop from stack)', () => {
      const box1 = document.getElementById('box1');

      pauseAnimations();
      expect(box1.style.animationPlayState).toBe('paused');

      // Call without argument - should pop from stack
      resumeAnimations();
      expect(box1.style.animationPlayState).toBe('');
    });

    it('should handle empty stack gracefully when called without argument', () => {
      expect(() => resumeAnimations()).not.toThrow();
    });
  });

  describe('pause and resume cycle', () => {
    it('should allow multiple pause/resume cycles', () => {
      const box1 = document.getElementById('box1');

      // First cycle
      const state1 = pauseAnimations();
      expect(box1.style.animationPlayState).toBe('paused');
      resumeAnimations(state1);
      expect(box1.style.animationPlayState).toBe('');

      // Second cycle
      const state2 = pauseAnimations();
      expect(box1.style.animationPlayState).toBe('paused');
      resumeAnimations(state2);
      expect(box1.style.animationPlayState).toBe('');
    });
  });
});