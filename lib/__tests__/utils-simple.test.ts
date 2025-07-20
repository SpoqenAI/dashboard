// Import shared test utility functions
import { add, multiply, formatCurrency } from './test-utils';

describe('Simple Utils', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-1, 5)).toBe(4);
    });

    it('should handle zero', () => {
      expect(add(0, 10)).toBe(10);
    });
  });

  describe('multiply', () => {
    it('should multiply two positive numbers', () => {
      expect(multiply(2, 3)).toBe(6);
    });

    it('should handle negative numbers', () => {
      expect(multiply(-2, 3)).toBe(-6);
    });

    it('should handle zero', () => {
      expect(multiply(0, 10)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      expect(formatCurrency(123.456)).toBe('$123.46');
    });

    it('should format whole numbers', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });
});
