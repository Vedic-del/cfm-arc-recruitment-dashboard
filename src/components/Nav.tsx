'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/login/actions';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/openings', label: 'Openings' },
  { href: '/candidates', label: 'Candidates' },
  { href: '/analytics', label: 'Analytics' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-paper/85 shadow-[0_1px_0_rgba(15,76,58,0.04)] backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-3.5 sm:gap-8 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-lg font-bold tracking-tight text-forest-900">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-forest-700 to-forest-950 text-sm font-bold text-green-100 shadow-sm">
            C
          </span>
          CFM ARC
        </Link>
        <div className="flex shrink-0 gap-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'text-forest-900'
                    : 'text-slate hover:text-forest-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-green-500" />
                )}
              </Link>
            );
          })}
        </div>
        {authEnabled && (
          <form action={logoutAction} className="ml-auto shrink-0">
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate transition-colors hover:bg-slate-100 hover:text-forest-900"
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}
