import { Navigation } from '../components/Navigation';
import { JobListings } from '../components/JobListings';

export default function JobsPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-neutral-50 mb-2">Planetary Resilience Tasks</h1>
          <p className="text-neutral-400 text-sm mb-6">
            Open projects (75-day clock). All listings are privacy-scrubbed for the public feed.
          </p>
          <JobListings />
        </div>
      </main>
    </>
  );
}
