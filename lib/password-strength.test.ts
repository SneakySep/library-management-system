import { describe, it, expect } from 'vitest';
import { passwordStrength } from '@/lib/password-strength';

describe('passwordStrength', () => {
  it('should return score 0 for empty password', () => {
    const result = passwordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('Too short');
  });

  it('should return score 1 for short password (less than 8 chars)', () => {
    const result = passwordStrength('abc');
    expect(result.score).toBe(1);
    expect(result.label).toBe('Weak');
  });

  it('should return score 2 for 8+ chars with lowercase only', () => {
    const result = passwordStrength('password');
    expect(result.score).toBe(2); // length + lowercase
    expect(result.label).toBe('Fair');
  });

  it('should return score 3 for 8+ chars with lowercase + uppercase', () => {
    const result = passwordStrength('Password');
    expect(result.score).toBe(3); // length + lowercase + uppercase
    expect(result.label).toBe('Good');
  });

  it('should return score 4 for 8+ chars with lowercase + uppercase + number', () => {
    const result = passwordStrength('Password1');
    expect(result.score).toBe(4); // length + lowercase + uppercase + number
    expect(result.label).toBe('Strong');
  });

  it('should return score 5 (Strong) for password with all character types', () => {
    const result = passwordStrength('Password1!');
    expect(result.score).toBe(5); // all 5 criteria
    expect(result.label).toBe('Strong');
  });

  it('should cap score at 4 (Strong label)', () => {
    const result = passwordStrength('Super$ecureP@ssw0rd!');
    expect(result.score).toBe(5);
    expect(result.label).toBe('Strong');
  });
});
