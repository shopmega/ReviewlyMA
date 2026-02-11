import { describe, it, expect } from 'vitest';
import {
  reviewSchema,
  loginSchema,
  signupSchema,
  proSignupSchema,
  resetPasswordRequestSchema,
  updatePasswordSchema,
  businessUpdateSchema,
} from '../types';

describe('Validation Schemas', () => {
  describe('reviewSchema', () => {
    it('should validate correct review data', () => {
      const validData = {
        businessId: 'test-business',
        title: 'Great experience',
        text: 'This is a detailed review with enough content',
        rating: 5,
        isAnonymous: false,
      };

      const result = reviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short title', () => {
      const invalidData = {
        businessId: 'test-business',
        title: 'Bad',
        text: 'This is a detailed review',
        rating: 5,
      };

      const result = reviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('title');
      }
    });

    it('should reject short text', () => {
      const invalidData = {
        businessId: 'test-business',
        title: 'Great experience',
        text: 'Short',
        rating: 5,
      };

      const result = reviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid rating', () => {
      const invalidData = {
        businessId: 'test-business',
        title: 'Great experience',
        text: 'This is a detailed review',
        rating: 6, // Invalid: max is 5
      };

      const result = reviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional sub-ratings', () => {
      const validData = {
        businessId: 'test-business',
        title: 'Great experience',
        text: 'This is a detailed review',
        rating: 5,
        subRatingService: 4,
        subRatingQuality: 5,
      };

      const result = reviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'short',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short full name', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'password123',
        fullName: 'A',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('proSignupSchema', () => {
    it('should validate correct pro signup data', () => {
      const validData = {
        email: 'pro@example.com',
        password: 'password123',
        fullName: 'John Doe',
        businessName: 'My Business',
        jobTitle: 'Manager',
      };

      const result = proSignupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require business name', () => {
      const invalidData = {
        email: 'pro@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      const result = proSignupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePasswordSchema', () => {
    it('should validate matching passwords', () => {
      const validData = {
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      const result = updatePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject non-matching passwords', () => {
      const invalidData = {
        password: 'newpassword123',
        confirmPassword: 'differentpassword',
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });
  });

  describe('businessUpdateSchema', () => {
    it('should validate correct business update data', () => {
      const validData = {
        title: 'New Business Update',
        text: 'This is a detailed update about the business',
      };

      const result = businessUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short title', () => {
      const invalidData = {
        title: 'Sh', // Less than 5 characters
        text: 'This is a detailed update about the business',
      };

      const result = businessUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('title');
      }
    });
  });
});

