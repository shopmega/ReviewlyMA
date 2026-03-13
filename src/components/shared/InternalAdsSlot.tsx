type InternalAdsSlotProps = {
  placement: string;
  context?: Record<string, unknown>;
  limit?: number;
  className?: string;
};

export async function InternalAdsSlot({
  placement: _placement,
  context: _context = {},
  limit: _limit = 2,
  className: _className = '',
}: InternalAdsSlotProps) {
  // Ads module decommissioned: keep slot component as no-op to avoid touching every page.
  return null;
}
