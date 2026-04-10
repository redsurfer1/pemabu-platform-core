import { ComplianceReviewDashboard } from '../components/ComplianceReviewDashboard';

export default function ComplianceReviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <ComplianceReviewDashboard />
      </div>
    </div>
  );
}
