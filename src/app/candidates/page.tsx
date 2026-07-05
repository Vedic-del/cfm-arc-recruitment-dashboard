import Link from 'next/link';
import { listCandidates } from '@/lib/db/candidates';

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; minExperience?: string; maxSalary?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const candidates = await listCandidates({
    query: sp.query,
    minExperience: sp.minExperience ? Number(sp.minExperience) : undefined,
    maxSalary: sp.maxSalary ? Number(sp.maxSalary) : undefined,
    source: sp.source,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Candidate Repository</h1>
        <Link href="/candidates/new" className="bg-blue-600 text-white rounded px-4 py-2">Add Candidate</Link>
      </div>
      <form className="flex gap-2 mb-4">
        <input name="query" placeholder="Search name/tags/source" defaultValue={sp.query} className="border p-2 rounded" />
        <input name="minExperience" type="number" placeholder="Min experience" defaultValue={sp.minExperience} className="border p-2 rounded" />
        <input name="maxSalary" type="number" placeholder="Max expected salary" defaultValue={sp.maxSalary} className="border p-2 rounded" />
        <button type="submit" className="bg-gray-200 rounded px-4 py-2">Filter</button>
      </form>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Name</th>
            <th className="p-2">Experience</th>
            <th className="p-2">Expected Salary</th>
            <th className="p-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-100">
              <td className="p-2"><Link href={`/candidates/${c.id}`}>{c.name}</Link></td>
              <td className="p-2">{c.years_experience_total}</td>
              <td className="p-2">{c.expected_salary}</td>
              <td className="p-2">{c.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
