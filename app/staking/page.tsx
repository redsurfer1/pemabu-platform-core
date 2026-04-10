import { ResiliencyUnderwritingPortal } from '../components/ResiliencyUnderwritingPortal';
import { Navigation } from '../components/Navigation';

export default function UnderwritingPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Navigation />
      <ResiliencyUnderwritingPortal />
    </div>
  );
}
