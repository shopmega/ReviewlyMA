import { notFound } from 'next/navigation';
import GATestingPageClient from './GATestingPageClient';

export default function GATestingPage() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_GA_TEST_PAGE === 'true';
  if (process.env.NODE_ENV === 'production' && !enabled) {
    notFound();
  }
  return <GATestingPageClient />;
}
