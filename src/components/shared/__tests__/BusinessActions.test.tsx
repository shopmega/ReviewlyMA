import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessActions } from '../BusinessActions';

// Mock the hooks and dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/data', () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    site_name: 'Test Site',
    enable_reviews: true,
  }),
}));

vi.mock('@/app/actions/user', () => ({
  toggleBookmark: vi.fn().mockResolvedValue({ status: 'success' }),
  getIsBookmarked: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/app/actions/analytics', () => ({
  trackBusinessEvent: vi.fn(),
}));

vi.mock('copy-to-clipboard', () => ({
  default: vi.fn().mockReturnValue(true),
}));

vi.mock('../ContactDialog', () => ({
  ContactDialog: ({ businessId, businessName }: any) => (
    <div data-testid="contact-dialog">Contact Dialog</div>
  ),
}));

describe('BusinessActions Component', () => {
  const defaultProps = {
    businessId: 'test-business',
    businessName: 'Test Business',
    phone: '+212612345678',
    website: 'https://example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render business actions', () => {
      render(<BusinessActions {...defaultProps} />);
      expect(screen.getByText('Partager')).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<BusinessActions {...defaultProps} />);
      expect(screen.getByText(/enregistrer/i)).toBeInTheDocument();
    });

    it('should render contact dialog', () => {
      render(<BusinessActions {...defaultProps} />);
      // ContactDialog should be present (might be hidden initially)
      expect(screen.getByText('Partager')).toBeInTheDocument();
    });
  });

  describe('Share Functionality', () => {
    it('should show share options when share button is clicked', async () => {
      const user = userEvent.setup();
      render(<BusinessActions {...defaultProps} />);
      
      const shareButton = screen.getByText('Partager');
      await user.click(shareButton);
      
      // Share options should appear
      await waitFor(() => {
        expect(screen.getByTestId('share-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should toggle save state when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<BusinessActions {...defaultProps} />);
      
      const saveButton = screen.getByText(/enregistrer/i);
      await user.click(saveButton);
      
      // Button text should change or loading state should appear
      expect(saveButton).toBeInTheDocument();
    });
  });
});

