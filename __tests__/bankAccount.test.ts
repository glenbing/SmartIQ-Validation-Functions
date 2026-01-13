import { validateNZBankAccount } from '../ValidateNZBankAccount/index';

describe('NZ Bank Account Validation', () => {
  describe('Valid bank accounts', () => {
    test('should validate a real valid ANZ account', () => {
      const result = validateNZBankAccount('01-0902-0068389-00');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate account with different bank', () => {
      const result = validateNZBankAccount('01-0001-0100003-00');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should handle account numbers with spaces', () => {
      const result = validateNZBankAccount('01 0902 0068389 00');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid format', () => {
    test('should reject account with wrong number of parts', () => {
      const result = validateNZBankAccount('01-0123-0123456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('format');
    });

    test('should reject account with invalid bank code length', () => {
      const result = validateNZBankAccount('1-0123-0123456-00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Bank code must be 2 digits');
    });

    test('should reject account with base too short', () => {
      const result = validateNZBankAccount('01-0123-012345-00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Account base must be 7-8 digits');
    });

    test('should reject account with base too long', () => {
      const result = validateNZBankAccount('01-0123-012345678-00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Account base must be 7-8 digits');
    });
  });

  describe('Invalid bank/branch', () => {
    test('should reject invalid bank code', () => {
      const result = validateNZBankAccount('99-0123-0123456-00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid bank code');
    });

    test('should reject invalid branch for valid bank', () => {
      const result = validateNZBankAccount('01-9999-0123456-00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not valid for bank');
    });
  });

  describe('Invalid checksum', () => {
    test('should reject account with invalid checksum', () => {
      const result = validateNZBankAccount('01-0001-0100003-01');
      // This should fail because we're changing a valid suffix
      // Actually all suffixes might be valid, let's test with bad base
      const result2 = validateNZBankAccount('01-0001-0100002-00');
      expect(result2.isValid).toBe(false);
      expect(result2.error).toContain('checksum');
    });
  });
});
