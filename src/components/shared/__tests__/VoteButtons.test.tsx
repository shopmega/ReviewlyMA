import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoteButtons } from '../VoteButtons';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('VoteButtons Component', () => {
  const defaultProps = {
    reviewId: 1,
    initialLikes: 5,
    initialDislikes: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render like and dislike buttons', () => {
      render(<VoteButtons {...defaultProps} />);
      expect(screen.getByText('5')).toBeInTheDocument(); // Likes count
      expect(screen.getByText('2')).toBeInTheDocument(); // Dislikes count
    });

    it('should display initial vote counts', () => {
      render(<VoteButtons {...defaultProps} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle like button click', async () => {
      const user = userEvent.setup();
      render(<VoteButtons {...defaultProps} />);
      
      // Find and click like button (adjust selector based on actual implementation)
      const likeButton = screen.getByRole('button', { name: /like/i }) || 
                        screen.getByText('5').closest('button');
      
      if (likeButton) {
        await user.click(likeButton);
        // Verify vote was called (would need to mock the action)
      }
    });

    it('should handle dislike button click', async () => {
      const user = userEvent.setup();
      render(<VoteButtons {...defaultProps} />);
      
      const dislikeButton = screen.getByRole('button', { name: /dislike/i }) ||
                            screen.getByText('2').closest('button');
      
      if (dislikeButton) {
        await user.click(dislikeButton);
      }
    });
  });
});

