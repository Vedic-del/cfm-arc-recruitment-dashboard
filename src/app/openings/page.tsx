import Link from 'next/link';
import { listOpenings } from '@/lib/db/openings';

export default async function OpeningsPage() {
  const openings = await listOpenings();
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Openings</h1>
        <Link href="/openings/new" className="bg-blue-600 text-white rounded px-4 py-2">Add Opening</Link>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Title</th>
            <th className="p-2">Department</th>
            <th className="p-2">Status</th>
            <th className="p-2">Priority</th>
            <th className="p-2">Opened</th>
          </tr>
        </thead>
        <tbody>
          {openings.map((o) => (
            <tr key={o.id} className="border-b hover:bg-gray-100">
              <td className="p-2"><Link href={`/openings/${o.id}`}>{o.title}</Link></td>
              <td className="p-2">{o.department}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2">{o.priority}</td>
              <td className="p-2">{o.date_opened}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
