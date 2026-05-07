import {
  getLeague,
  getUsers,
  getRosters,
  getAllPlayers,
  buildTeams,
  enrichPlayers,
  getPositionColor,
  getDraftClassColor,
  formatPoints,
} from '@/lib/sleeper';
import { Users, Shield, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { TeamData, EnrichedPlayer } from '@/types/sleeper';

export const revalidate = 300;

export const metadata = {
  title: 'Teams | Young Bucks Fantasy Hub',
};

export default async function TeamsPage() {
  try {
    const [users, rosters, playersMap] = await Promise.all([
      getUsers(),
      getRosters(),
      getAllPlayers(),
    ]);
    const teams = buildTeams(rosters, users);
    const allPlayers = enrichPlayers(playersMap, rosters, teams);

    const teamsWithRosters = teams.map((t) => ({
      ...t,
      players: allPlayers
        .filter((p) => p.fantasyTeamId === t.roster.roster_id)
        .sort((a, b) => {
          const order: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 4 };
          const oa = order[a.position] ?? 5;
          const ob = order[b.position] ?? 5;
          if (oa !== ob) return oa - ob;
          return (a.search_rank ?? 999999) - (b.search_rank ?? 999999);
        }),
    }));

    const totalProtected = allPlayers.filter((p) => p.isProtected).length;
    const avgRosterSize = (totalProtected / teams.length).toFixed(1);

    return (
      <div className="page-container space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={20} className="text-blue-400" />
              <h1 className="section-heading">League Teams</h1>
            </div>
            <p className="text-zinc-500 text-sm">
              {teams.length} teams · {totalProtected} protected players · {avgRosterSize} avg
              roster size
            </p>
          </div>
        </div>

        {/* Teams grid */}
        <div className="grid lg:grid-cols-2 gap-5">
          {teamsWithRosters.map((t) => (
            <TeamCard key={t.roster.roster_id} team={t} />
          ))}
        </div>
      </div>
    );
  } catch {
    return (
      <div className="page-container">
        <div className="card p-10 text-center max-w-md mx-auto mt-10">
          <Users size={36} className="text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Could not load teams</h2>
          <p className="text-zinc-500 text-sm">
            Sleeper API may be temporarily unavailable. Please refresh.
          </p>
        </div>
      </div>
    );
  }
}

type TeamWithPlayers = TeamData & { players: EnrichedPlayer[] };

function TeamCard({ team: t }: { team: TeamWithPlayers }) {
  const record = `${t.wins}-${t.losses}${t.ties > 0 ? `-${t.ties}` : ''}`;
  const winPct = t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) : 0;
  const classDist = t.players.reduce<Record<number, number>>((acc, p) => {
    acc[p.draftClass] = (acc[p.draftClass] ?? 0) + 1;
    return acc;
  }, {});
  const posCount = t.players.reduce<Record<string, number>>((acc, p) => {
    acc[p.position] = (acc[p.position] ?? 0) + 1;
    return acc;
  }, {});

  const injuries = t.players.filter(
    (p) => p.injury_status === 'Out' || p.injury_status === 'IR'
  ).length;

  return (
    <div className="card overflow-hidden">
      {/* Team header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{t.teamName}</h2>
              {injuries > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10} />
                  {injuries} out
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">{t.ownerName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-xl font-black ${winPct >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                {record}
              </span>
              <span className={winPct >= 0.5 ? 'text-green-500' : 'text-red-500'}>
                {winPct >= 0.5 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </span>
            </div>
            <p className="text-zinc-600 text-xs mt-0.5">
              {formatPoints(t.pointsFor)} pts for
            </p>
          </div>
        </div>

        {/* Win pct bar */}
        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${winPct >= 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${winPct * 100}%` }}
          />
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-3 text-xs text-zinc-500">
          <span>
            <strong className="text-zinc-300">{t.players.length}</strong> players
          </span>
          {Object.entries(classDist)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([yr, ct]) => (
              <span key={yr}>
                <strong className={getDraftClassColor(Number(yr)).split(' ')[0]?.replace('text-', 'text-') ?? 'text-zinc-300'}>
                  {ct}
                </strong>{' '}
                &apos;{String(yr).slice(2)}
              </span>
            ))}
          {Object.entries(posCount).map(([pos, ct]) => (
            <span key={pos}>
              <strong className="text-zinc-300">{ct}</strong> {pos}
            </span>
          ))}
        </div>
      </div>

      {/* Roster list */}
      <div className="divide-y divide-zinc-800/40 max-h-72 overflow-y-auto">
        {t.players.length === 0 ? (
          <p className="px-5 py-6 text-zinc-600 text-sm text-center">No players on roster</p>
        ) : (
          t.players.map((p) => (
            <div
              key={p.player_id}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-800/40 transition-colors"
            >
              <span className={`pos-badge ${getPositionColor(p.position)}`} style={{ minWidth: 30, justifyContent: 'center' }}>
                {p.position}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.full_name}</p>
                <p className="text-zinc-600 text-xs truncate">{p.team ?? 'FA'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`class-badge ${getDraftClassColor(p.draftClass)}`}>
                  &apos;{String(p.draftClass).slice(2)}
                </span>
                {p.injury_status && (
                  <span className="text-xs text-red-400">
                    <AlertTriangle size={11} />
                  </span>
                )}
                {p.search_rank != null && (
                  <span className="text-zinc-600 text-xs font-mono">#{p.search_rank}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {t.players.length > 0 && (
        <div className="px-5 py-2.5 border-t border-zinc-800 bg-zinc-900/50 flex justify-between text-xs text-zinc-600">
          <span>
            Best ranked:{' '}
            <span className="text-zinc-400 font-medium">
              {t.players
                .filter((p) => p.search_rank != null)
                .sort((a, b) => (a.search_rank ?? 999999) - (b.search_rank ?? 999999))[0]
                ?.full_name ?? '—'}
            </span>
          </span>
          <span>
            PA: <span className="text-zinc-400">{formatPoints(t.pointsAgainst)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
