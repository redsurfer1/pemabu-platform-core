'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/mfo');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-950 text-teal-500">
      <div className="animate-pulse">Initializing Pemabu MFO...</div>
    </div>
  );
}
