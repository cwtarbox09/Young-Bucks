import Link from 'next/link';
import { Trophy } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-600 text-white">
              <Trophy size={13} strokeWidth={2.5} />
            </span>
            <span className="text-zinc-400 font-semibold text-sm">Young Bucks Fantasy Hub</span>
          </Link>
          <div className="flex items-center gap-6 text-zinc-600 text-xs">
            <Link href="/free-agents" className="hover:text-zinc-400 transition-colors">
              Free Agents
            </Link>
            <Link href="/teams" className="hover:text-zinc-400 transition-colors">
              Teams
            </Link>
            <Link href="/history" className="hover:text-zinc-400 transition-colors">
              History
            </Link>
            <Link href="/stats" className="hover:text-zinc-400 transition-colors">
              Stats
            </Link>
          </div>
          <p className="text-zinc-700 text-xs">
            Powered by{' '}
            <span className="text-zinc-500 font-medium">Sleeper</span> · 2024+ Draft Class Only
          </p>
        </div>
      </div>
    </footer>
  );
}
