import { Spinner } from '@/components/Spinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24 text-forest-900">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
