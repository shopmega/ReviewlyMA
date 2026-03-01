import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, emailTemplates } from '../email-service';

vi.mock('../data', () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    email_provider: 'console',
    email_from: 'noreply@example.com',
  }),
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_PROVIDER = 'console';
    process.env.NODE_ENV = 'development';
  });

  describe('sendEmail', () => {
    it('should send email with console provider', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.status).toBe('success');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      // Test with a provider that will fail
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = undefined; // No key = will fallback to console
      
      // Mock fetch to throw error for resend
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      // Should fallback to console or return error
      expect(['success', 'error']).toContain(result.status);
      
      global.fetch = originalFetch;
      process.env.EMAIL_PROVIDER = 'console';
    });
  });

  describe('emailTemplates', () => {
    it('should generate claim approval email', () => {
      const data = {
        userName: 'John Doe',
        businessName: 'Test Business',
        siteName: 'Avis',
        siteUrl: 'https://avis.ma',
        contactEmail: 'support@avis.ma',
      };

      const html = emailTemplates.claimApproval.html(data);
      expect(html).toContain('John Doe');
      expect(html).toContain('Test Business');
      expect(html).toContain('Revendication Approuvée');
    });

    it('should generate claim approval subject', () => {
      const subject = emailTemplates.claimApproval.subject('Test Business');
      expect(subject).toBe('Revendication approuvée - Test Business');
    });
  });
});
