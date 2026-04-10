import Link from 'next/link';

/** Static shell only — `/` is redirected to `/mfo` in middleware to avoid Next 15 workUnitAsyncStorage issues on `/`. */
export const dynamic = 'force-static';

export default function RootPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-teal-500">
      <p className="text-sm text-neutral-400">If you are not redirected automatically, continue manually.</p>
      <Link
        href="/mfo"
        className="rounded-lg bg-teal-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
      >
        Open Pemabu MFO
      </Link>
    </div>
  );
}
