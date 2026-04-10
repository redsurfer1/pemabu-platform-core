import { Navigation } from '../../components/Navigation';
import { ProjectDashboard } from '../../components/ProjectDashboard';

export default function ProjectPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen py-8">
        <ProjectDashboard />
      </main>
    </>
  );
}
