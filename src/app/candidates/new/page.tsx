import { listOpenings } from '@/lib/db/openings';
import { createCandidateAction } from './actions';

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ openingId?: string }>;
}) {
  const { openingId } = await searchParams;
  const openings = await listOpenings();
  return (
    <form action={createCandidateAction} encType="multipart/form-data" className="max-w-lg flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add Candidate</h1>
      <select name="opening_id" defaultValue={openingId ?? ''} required className="border p-2 rounded">
        <option value="" disabled>Select opening</option>
        {openings.map((o) => (
          <option key={o.id} value={o.id}>{o.title}</option>
        ))}
      </select>
      <input name="name" placeholder="Full name" required className="border p-2 rounded" />
      <input name="phone" placeholder="Phone" className="border p-2 rounded" />
      <input name="email" placeholder="Email" className="border p-2 rounded" />
      <input name="location" placeholder="Location" className="border p-2 rounded" />
      <input name="current_employer" placeholder="Current employer" className="border p-2 rounded" />
      <input name="current_designation" placeholder="Current designation" className="border p-2 rounded" />
      <input name="years_experience_total" type="number" step="0.5" placeholder="Years experience (total)" className="border p-2 rounded" />
      <input name="years_experience_relevant" type="number" step="0.5" placeholder="Years experience (relevant)" className="border p-2 rounded" />
      <input name="current_salary" type="number" placeholder="Current salary (CTC)" className="border p-2 rounded" />
      <input name="expected_salary" type="number" placeholder="Expected salary" className="border p-2 rounded" />
      <input name="notice_period" placeholder="Notice period" className="border p-2 rounded" />
      <input name="source" placeholder="Source (referral, portal, etc.)" className="border p-2 rounded" />
      <input name="tags" placeholder="Tags/notes" className="border p-2 rounded" />
      <input name="resume" type="file" accept=".pdf,.doc,.docx" className="border p-2 rounded" />
      <button type="submit" className="bg-blue-600 text-white rounded p-2">Add Candidate</button>
    </form>
  );
}
