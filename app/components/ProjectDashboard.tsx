'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, Tag, Users, ArrowLeft } from 'lucide-react';

type ProjectData = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  status: string;
  promotedAt: string | null;
  deadlineDays: number;
  createdAt: string;
  deadlineAt: string;
  bids?: { id: string; userId: string; amount: number | null; message: string | null; status: string; createdAt: string }[];
};

function useProjectClock(deadlineAt: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(deadlineAt);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const expired = diff <= 0;
  return { days, hours, minutes, expired };
}

export function ProjectDashboard() {
  const params = useParams();
  const id = params?.id as string;
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const clock = useProjectClock(project?.deadlineAt ?? new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString());

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/${id}?asLead=false`)
      .then((res) => res.json())
      .then(setProject)
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse h-64 rounded-lg bg-neutral-800/50" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to listings
      </Link>
      <div className="rounded-lg border border-neutral-700/80 bg-neutral-900/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">{project.title}</h1>
            <p className="mt-2 text-neutral-400">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                >
                  <Tag className="w-3 h-3" />
                  {s}
                </span>
              ))}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              project.status === 'OPEN'
                ? 'bg-emerald-500/20 text-emerald-400'
                : project.status === 'FILLED'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-neutral-600 text-neutral-400'
            }`}
          >
            {project.status}
          </span>
        </div>

        {/* 75-day project clock */}
        <div className="mt-6 flex items-center gap-4 rounded-lg bg-neutral-800/60 p-4">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-neutral-300">Project clock ({project.deadlineDays} days)</p>
            {clock && (
              <p className="text-lg font-mono text-neutral-100 mt-0.5">
                {clock.expired ? (
                  'Ended'
                ) : (
                  <>
                    {clock.days}d {clock.hours}h {clock.minutes}m left
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {project.bids && project.bids.length > 0 && (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Users className="w-4 h-4" />
              Bids ({project.bids.length})
            </h3>
            <ul className="mt-2 space-y-2">
              {project.bids.map((b) => (
                <li
                  key={b.id}
                  className="rounded border border-neutral-700/60 bg-neutral-800/40 px-3 py-2 text-sm"
                >
                  <span className="text-neutral-400">Bid #{b.id.slice(0, 8)}</span>
                  {b.amount != null && <span className="ml-2 text-neutral-300">${typeof b.amount === 'number' ? b.amount.toFixed(2) : Number(b.amount).toFixed(2)}</span>}
                  <span className={`ml-2 ${b.status === 'ACCEPTED' ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
