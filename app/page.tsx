import Link from 'next/link';
import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const q = await searchParams;
  const hasQuery = q && Object.keys(q).length > 0;

  if (hasQuery) {
    const err = typeof q.error === 'string' ? q.error : null;
    const redirectTo = typeof q.redirect === 'string' ? q.redirect : null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-neutral-100">
        <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
          <h1 className="text-lg font-semibold text-neutral-100">Pemabu</h1>
          <p className="mt-2 text-sm text-neutral-400">
            {err === 'authentication_required' && 'Sign in is required for that area.'}
            {err === 'access_denied' && 'You do not have access to that area.'}
            {err === 'invalid_session' && 'Your session could not be validated.'}
            {!err && 'Request could not be completed from this page.'}
          </p>
          {redirectTo ? (
            <p className="mt-2 text-xs text-neutral-500">Requested: {redirectTo}</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/mfo"
              className="rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Open MFO dashboard
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  redirect('/mfo');
}
