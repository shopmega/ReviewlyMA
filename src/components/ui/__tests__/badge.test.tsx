import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      const { container } = render(<Badge>Default</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-primary');
    });

    it('should render with secondary variant', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-secondary');
    });

    it('should render with destructive variant', () => {
      const { container } = render(<Badge variant="destructive">Error</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-destructive');
    });

    it('should render with outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('border-border');
    });

    it('should render with success variant', () => {
      const { container } = render(<Badge variant="success">Success</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-emerald-600');
    });

    it('should render with warning variant', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-amber-600');
    });

    it('should render with error variant', () => {
      const { container } = render(<Badge variant="error">Error</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-rose-600');
    });

    it('should render with info variant', () => {
      const { container } = render(<Badge variant="info">Info</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-indigo-600');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Badge className="custom-badge">Custom</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('custom-badge');
    });

    it('should have rounded-full class', () => {
      const { container } = render(<Badge>Badge</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Badge aria-label="Status badge">Active</Badge>);
      expect(screen.getByLabelText('Status badge')).toBeInTheDocument();
    });

    it('should support role attribute', () => {
      render(<Badge role="status">Status</Badge>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});



