'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Clock, Tag } from 'lucide-react';

export type JobFeedItem = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  promotedAt: string;
  deadlineDays: number;
};

export function JobListings() {
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => res.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-neutral-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-neutral-400">
        <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No promoted jobs right now. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-emerald-500" />
        Job Listings
      </h2>
      <ul className="space-y-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="block rounded-lg border border-neutral-700/80 bg-neutral-900/60 p-4 hover:border-emerald-500/40 hover:bg-neutral-800/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-neutral-50 truncate">{job.title}</h3>
                  <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{job.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {job.deadlineDays}-day project
                    </span>
                    {job.skills.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {job.skills.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-emerald-500">View →</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
