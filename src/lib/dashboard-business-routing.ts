export function buildDashboardBusinessHref(
  pathname: string,
  currentQuery: string,
  businessId: string
): string | null {
  if (!businessId || !pathname.startsWith('/dashboard')) {
    return null;
  }

  if (pathname.startsWith('/dashboard/business/')) {
    return `/dashboard/business/${businessId}`;
  }

  const params = new URLSearchParams(currentQuery);
  params.set('id', businessId);

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function appendBusinessIdToHref(href: string, businessId: string | null | undefined): string {
  if (!businessId || !href.startsWith('/dashboard') || href.startsWith('/dashboard/business/')) {
    return href;
  }

  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('id', businessId);

  return `${path}?${params.toString()}`;
}
