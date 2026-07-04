import { createOpeningAction } from './actions';

export default function NewOpeningPage() {
  return (
    <form action={createOpeningAction} className="max-w-lg flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add Opening</h1>
      <input name="title" placeholder="Role title" required className="border p-2 rounded" />
      <input name="department" placeholder="Department" className="border p-2 rounded" />
      <input name="level" placeholder="Level/Grade" className="border p-2 rounded" />
      <input name="hiring_manager" placeholder="Hiring manager" className="border p-2 rounded" />
      <input name="positions_count" type="number" defaultValue={1} min={1} className="border p-2 rounded" />
      <input name="date_opened" type="date" className="border p-2 rounded" />
      <select name="priority" defaultValue="normal" className="border p-2 rounded">
        <option value="normal">Normal</option>
        <option value="urgent">Urgent</option>
      </select>
      <input name="target_close_date" type="date" className="border p-2 rounded" />
      <button type="submit" className="bg-blue-600 text-white rounded p-2">Create Opening</button>
    </form>
  );
}
