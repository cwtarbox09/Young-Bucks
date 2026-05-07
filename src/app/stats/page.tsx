import {
  getUsers,
  getRosters,
  getAllPlayers,
  buildTeams,
  enrichPlayers,
  getPositionColor,
  getDraftClassColor,
  formatPoints,
} from '@/lib/sleeper';
import { BarChart3, Users, Star, Shield, Zap } from 'lucide-react';
import type { EnrichedPlayer, TeamData } from '@/types/sleeper';

export const revalidate = 300;

export const metadata = {
  title: 'League Stats | Young Bucks Fantasy Hub',
};

export default async function StatsPage() {
  try {
    const [users, rosters, playersMap] = await Promise.all([
      getUsers(),
      getRosters(),
      getAllPlayers(),
    ]);
    const teams = buildTeams(rosters, users);
    const allPlayers = enrichPlayers(playersMap, rosters, teams);

    // Draft class breakdown
    const byClass = [2024, 2025, 2026].map((yr) => {
      const cls = allPlayers.filter((p) => p.draftClass === yr);
      const rostered = cls.filter((p) => p.isProtected);
      const free = cls.filter((p) => !p.isProtected);
      const byPos = ['QB', 'RB', 'WR', 'TE'].map((pos) => ({
        pos,
        total: cls.filter((p) => p.position === pos).length,
        rostered: cls.filter((p) => p.position === pos && p.isProtected).length,
      }));
      return { year: yr, total: cls.length, rostered: rostered.length, free: free.length, byPos };
    });

    // Top ranked players per position (all eligible)
    const topByPos = ['QB', 'RB', 'WR', 'TE'].map((pos) => ({
      pos,
      players: allPlayers
        .filter((p) => p.position === pos && p.search_rank != null)
        .sort((a, b) => (a.search_rank ?? 999999) - (b.search_rank ?? 999999))
        .slice(0, 10),
    }));

    // Team analytics
    const teamAnalytics = teams.map((t) => {
      const roster = allPlayers.filter((p) => p.fantasyTeamId === t.roster.roster_id);
      const avgRank =
        roster.filter((p) => p.search_rank != null).reduce((sum, p) => sum + (p.search_rank ?? 0), 0) /
        (roster.filter((p) => p.search_rank != null).length || 1);
      const classDist = roster.reduce<Record<number, number>>((acc, p) => {
        acc[p.draftClass] = (acc[p.draftClass] ?? 0) + 1;
        return acc;
      }, {});
      const youngest = [...roster].sort((a, b) => (a.years_exp ?? 99) - (b.years_exp ?? 99))[0];
      return { team: t, roster, avgRank, classDist, youngest };
    });

    // Position distribution across league
    const positionDistribution = ['QB', 'RB', 'WR', 'TE'].map((pos) => {
      const total = allPlayers.filter((p) => p.position === pos).length;
      const rostered = allPlayers.filter((p) => p.position === pos && p.isProtected).length;
      return { pos, total, rostered, free: total - rostered };
    });

    // Most stacked teams (most top-100 search_rank players)
    const stackedTeams = teamAnalytics
      .map((ta) => ({
        team: ta.team,
        top100: ta.roster.filter((p) => p.search_rank != null && p.search_rank <= 100).length,
        top50: ta.roster.filter((p) => p.search_rank != null && p.search_rank <= 50).length,
      }))
      .sort((a, b) => b.top100 - a.top100);

    return (
      <div className="page-container space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-purple-400" />
            <h1 className="section-heading">League Stats</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Draft class breakdowns, position leaderboards, and roster analytics
          </p>
        </div>

        {/* Draft Class Overview */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-amber-400" /> Draft Class Breakdown
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {byClass.filter((c) => c.total > 0).map((c) => (
              <DraftClassCard key={c.year} data={c} />
            ))}
          </div>

          {/* Position × Class matrix */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-2">
              <Shield size={14} className="text-zinc-400" />
              <span className="text-sm font-semibold text-white">
                Position × Class Distribution
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">Class</th>
                    {['QB', 'RB', 'WR', 'TE'].map((pos) => (
                      <th key={pos} className="text-center px-4 py-3 font-medium">{pos}</th>
                    ))}
                    <th className="text-right px-5 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {byClass.filter((c) => c.total > 0).map((c) => (
                    <tr key={c.year} className="table-row-hover">
                      <td className="px-5 py-3">
                        <span className={`class-badge ${getDraftClassColor(c.year)}`}>
                          {c.year}
                        </span>
                      </td>
                      {c.byPos.map((bp) => (
                        <td key={bp.pos} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-white font-semibold">{bp.total}</span>
                            {bp.rostered > 0 && (
                              <span className="text-zinc-600 text-xs">
                                {bp.rostered} prot.
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right font-bold text-white">{c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Position Distribution */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap size={16} className="text-green-400" /> Position Distribution
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {positionDistribution.map((pd) => (
              <PositionDistCard key={pd.pos} data={pd} />
            ))}
          </div>
        </section>

        {/* Top Players Per Position */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-green-400" /> Top Players by Position
          </h2>
          <div className="grid lg:grid-cols-2 gap-5">
            {topByPos.map(({ pos, players }) => (
              <PositionLeaderboard key={pos} pos={pos} players={players} />
            ))}
          </div>
        </section>

        {/* Team Roster Analytics */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-400" /> Roster Analytics
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Most stacked */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white text-sm">Most Top-Ranked Players</h3>
                <p className="text-zinc-600 text-xs mt-0.5">Teams with most players in top-100 Sleeper ranking</p>
              </div>
              <div className="divide-y divide-zinc-800/40">
                {stackedTeams.map((s, i) => (
                  <div key={s.team.roster.roster_id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                    <span className="text-zinc-600 font-bold text-sm w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{s.team.teamName}</p>
                      <p className="text-zinc-600 text-xs">{s.team.ownerName}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-center">
                        <p className="text-amber-400 font-bold text-base">{s.top50}</p>
                        <p className="text-zinc-600">Top 50</p>
                      </div>
                      <div className="text-center">
                        <p className="text-green-400 font-bold text-base">{s.top100}</p>
                        <p className="text-zinc-600">Top 100</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Points table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white text-sm">Team Points Summary</h3>
                <p className="text-zinc-600 text-xs mt-0.5">Points scored and allowed this season</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-2.5 font-medium">Team</th>
                      <th className="text-right px-3 py-2.5 font-medium">PF</th>
                      <th className="text-right px-5 py-2.5 font-medium">PA</th>
                      <th className="text-right px-5 py-2.5 font-medium">Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {[...teams]
                      .sort((a, b) => b.pointsFor - a.pointsFor)
                      .map((t) => {
                        const diff = t.pointsFor - t.pointsAgainst;
                        return (
                          <tr key={t.roster.roster_id} className="table-row-hover">
                            <td className="px-5 py-2.5">
                              <p className="text-white font-medium text-xs truncate">{t.teamName}</p>
                            </td>
                            <td className="px-3 py-2.5 text-right text-green-400 font-semibold tabular-nums text-xs">
                              {formatPoints(t.pointsFor)}
                            </td>
                            <td className="px-5 py-2.5 text-right text-zinc-400 tabular-nums text-xs">
                              {formatPoints(t.pointsAgainst)}
                            </td>
                            <td className={`px-5 py-2.5 text-right tabular-nums text-xs font-semibold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {diff >= 0 ? '+' : ''}{formatPoints(diff)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  } catch {
    return (
      <div className="page-container">
        <div className="card p-10 text-center max-w-md mx-auto mt-10">
          <BarChart3 size={36} className="text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Could not load stats</h2>
          <p className="text-zinc-500 text-sm">
            Sleeper API may be temporarily unavailable. Please refresh.
          </p>
        </div>
      </div>
    );
  }
}

function DraftClassCard({
  data,
}: {
  data: { year: number; total: number; rostered: number; free: number };
}) {
  const pct = data.total > 0 ? (data.rostered / data.total) * 100 : 0;
  const colorMap: Record<number, { bg: string; border: string; text: string; bar: string }> = {
    2024: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
    },
    2025: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      bar: 'bg-purple-500',
    },
    2026: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      bar: 'bg-cyan-500',
    },
  };
  const c = colorMap[data.year] ?? colorMap[2026];

  return (
    <div className={`card p-5 border ${c.border}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-2xl font-black ${c.text}`}>{data.year}</span>
        <span className="text-zinc-500 text-sm font-medium">Draft Class</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Total Players</span>
          <span className="text-white font-bold">{data.total}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Protected</span>
          <span className={`font-bold ${c.text}`}>{data.rostered}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Free Agents</span>
          <span className="text-green-400 font-bold">{data.free}</span>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
          <span>Protected rate</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${c.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PositionDistCard({
  data,
}: {
  data: { pos: string; total: number; rostered: number; free: number };
}) {
  const pct = data.total > 0 ? (data.rostered / data.total) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={`pos-badge ${getPositionColor(data.pos)}`}>{data.pos}</span>
        <span className="text-zinc-500 text-sm">Position</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div>
          <p className="text-2xl font-black text-white">{data.total}</p>
          <p className="text-zinc-600 text-xs">Total</p>
        </div>
        <div>
          <p className="text-2xl font-black text-amber-400">{data.rostered}</p>
          <p className="text-zinc-600 text-xs">Protected</p>
        </div>
        <div>
          <p className="text-2xl font-black text-green-400">{data.free}</p>
          <p className="text-zinc-600 text-xs">Available</p>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PositionLeaderboard({
  pos,
  players,
}: {
  pos: string;
  players: EnrichedPlayer[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
        <span className={`pos-badge ${getPositionColor(pos)}`}>{pos}</span>
        <span className="text-sm font-semibold text-white">Top {pos}s (2024+ Class)</span>
      </div>
      <div className="divide-y divide-zinc-800/40">
        {players.map((p, i) => (
          <div
            key={p.player_id}
            className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="text-zinc-600 text-sm font-bold w-4 tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{p.full_name}</p>
              <p className="text-zinc-600 text-xs">{p.team ?? 'FA'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`class-badge ${getDraftClassColor(p.draftClass)}`}>
                &apos;{String(p.draftClass).slice(2)}
              </span>
              {p.isProtected ? (
                <span className="text-xs text-amber-500 flex items-center gap-0.5">
                  <Shield size={10} />
                  <span className="hidden sm:inline text-xs">{p.fantasyTeamName}</span>
                </span>
              ) : (
                <span className="text-xs text-green-500 flex items-center gap-0.5">
                  <Star size={10} />
                  <span className="hidden sm:inline">Free</span>
                </span>
              )}
              <span className="text-zinc-600 text-xs font-mono">#{p.search_rank}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
