import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CFM ARC Recruitment Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-white border-b px-6 py-4 flex gap-6">
          <Link href="/" className="font-semibold">Dashboard</Link>
          <Link href="/openings">Openings</Link>
          <Link href="/candidates">Candidates</Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
