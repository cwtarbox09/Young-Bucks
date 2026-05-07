import { getRosters, getUsers, getAllPlayers, buildTeams, enrichPlayers } from '@/lib/sleeper';
import FreeAgentsList from '@/components/FreeAgentsList';
import type { EnrichedPlayer } from '@/types/sleeper';
import { Star, Shield, Info } from 'lucide-react';

export const revalidate = 300;

export const metadata = {
  title: 'Best Available Free Agents | Young Bucks Fantasy Hub',
};

export default async function FreeAgentsPage() {
  try {
    const [users, rosters, playersMap] = await Promise.all([
      getUsers(),
      getRosters(),
      getAllPlayers(),
    ]);
    const teams = buildTeams(rosters, users);
    const allPlayers = enrichPlayers(playersMap, rosters, teams);

    const freeAgents: EnrichedPlayer[] = allPlayers
      .filter((p) => !p.isProtected)
      .sort((a, b) => (a.search_rank ?? 999999) - (b.search_rank ?? 999999));

    const draftClassCounts = freeAgents.reduce<Record<number, number>>((acc, p) => {
      acc[p.draftClass] = (acc[p.draftClass] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <div className="page-container space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star size={20} className="text-green-400" />
              <h1 className="section-heading">Best Available</h1>
            </div>
            <p className="text-zinc-500 text-sm">
              Unprotected players from the 2024+ draft class, ranked by fantasy value
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400">
              <Star size={11} className="text-green-400" />
              {freeAgents.length} available
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400">
              <Shield size={11} className="text-amber-400" />
              {allPlayers.filter((p) => p.isProtected).length} protected
            </span>
          </div>
        </div>

        <DraftClassBreakdown counts={draftClassCounts} />

        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-300 text-xs">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>
            Players ranked by Sleeper&apos;s fantasy value score. Lower rank = higher value.
            Only players with <strong className="text-blue-200">years_exp ≤ 2</strong> (2024–2026
            draft classes) are shown.
          </span>
        </div>

        <FreeAgentsList players={freeAgents} />
      </div>
    );
  } catch {
    return (
      <div className="page-container">
        <div className="card p-10 text-center max-w-md mx-auto mt-10">
          <Star size={36} className="text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Could not load free agents</h2>
          <p className="text-zinc-500 text-sm">
            Sleeper API may be temporarily unavailable. Please refresh.
          </p>
        </div>
      </div>
    );
  }
}

function DraftClassBreakdown({ counts }: { counts: Record<number, number> }) {
  const colorMap: Record<number, string> = {
    2024: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    2025: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    2026: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  };

  const entries = Object.entries(counts)
    .map(([y, c]) => ({ year: Number(y), count: c }))
    .sort((a, b) => a.year - b.year);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(({ year, count }) => (
        <span
          key={year}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${colorMap[year] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
        >
          {year} Class
          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-xs font-bold">{count}</span>
        </span>
      ))}
    </div>
  );
}
