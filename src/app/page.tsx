import Link from 'next/link';
import { listOpenings, averageTimeToFill } from '@/lib/db/openings';
import { getStuckCandidates, getStageCounts, getAverageTimeInStage } from '@/lib/db/pipeline';

export default async function DashboardPage() {
  const openings = await listOpenings();
  const stuck = await getStuckCandidates();
  const stageCounts = await getStageCounts();
  const avgTimeInStage = await getAverageTimeInStage();
  const avgFill = await averageTimeToFill();

  const openingsByStatus: Record<string, number> = {};
  for (const o of openings) {
    openingsByStatus[o.status] = (openingsByStatus[o.status] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Recruitment Dashboard</h1>

      <section>
        <h2 className="font-medium mb-2">Openings by status</h2>
        <div className="flex gap-4">
          {Object.entries(openingsByStatus).map(([status, count]) => (
            <div key={status} className="border rounded p-3">
              <p className="text-2xl">{count}</p>
              <p className="text-sm text-gray-600">{status}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Candidates per stage</h2>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div key={stage} className="border rounded p-3">
              <p className="text-2xl">{count}</p>
              <p className="text-sm text-gray-600">{stage}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Average time to fill</h2>
        <p>{avgFill !== null ? `${avgFill.toFixed(1)} days` : 'No filled openings yet'}</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Average time in stage (bottlenecks)</h2>
        <ul className="list-disc pl-5 text-sm">
          {Object.entries(avgTimeInStage).map(([stage, days]) => (
            <li key={stage}>{stage}: {days.toFixed(1)} days</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2 text-red-600">Stuck candidates ({stuck.length})</h2>
        <ul className="list-disc pl-5 text-sm">
          {stuck.map((c) => (
            <li key={c.candidateOpeningId}>
              <Link href={`/candidates/${c.candidateId}`}>{c.candidateName}</Link> — stuck in {c.currentStage}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
