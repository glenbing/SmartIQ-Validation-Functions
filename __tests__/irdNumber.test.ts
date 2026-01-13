import { validateNZIRDNumber } from '../ValidateNZIRDNumber/index';

describe('NZ IRD Number Validation', () => {
  describe('Valid IRD numbers', () => {
    test('should validate known valid IRD number (49091850)', () => {
      const result = validateNZIRDNumber('49091850');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate 9-digit IRD number', () => {
      const result = validateNZIRDNumber('100000008');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate 8-digit IRD number', () => {
      const result = validateNZIRDNumber('35901981');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should handle IRD numbers with dashes', () => {
      const result = validateNZIRDNumber('49-091-850');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid format', () => {
    test('should reject IRD with non-numeric characters', () => {
      const result = validateNZIRDNumber('12345678A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must contain only digits');
    });

    test('should reject IRD that is too short', () => {
      const result = validateNZIRDNumber('1234567');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be 8 or 9 digits');
    });

    test('should reject IRD that is too long', () => {
      const result = validateNZIRDNumber('1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be 8 or 9 digits');
    });
  });

  describe('Invalid range', () => {
    test('should reject IRD below minimum range', () => {
      const result = validateNZIRDNumber('9999999');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be 8 or 9 digits');
    });

    test('should reject IRD above maximum range', () => {
      const result = validateNZIRDNumber('150000001');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('out of valid range');
    });
  });

  describe('Invalid checksum', () => {
    test('should reject IRD with wrong check digit', () => {
      const result = validateNZIRDNumber('49091851');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('failed checksum validation');
    });

    test('should reject IRD with invalid checksum', () => {
      const result = validateNZIRDNumber('12345678');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('failed checksum validation');
    });
  });
});
