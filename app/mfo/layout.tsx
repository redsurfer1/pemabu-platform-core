export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MFO Dashboard | Pemabu',
  description:
    'Modern Family Office decision-support: risk parity workbook view (educational only).',
};

export default function MfoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
