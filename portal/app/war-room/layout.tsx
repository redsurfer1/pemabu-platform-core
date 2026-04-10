import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PEMABU War Room - V4.1 Gold Standard',
  description: 'Entity-scoped Command & Control Center for PEMABU Platform V4.1 Gold Standard',
};

export default function WarRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
