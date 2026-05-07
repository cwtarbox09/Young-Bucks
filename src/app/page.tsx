import Link from 'next/link';
import {
  Users,
  TrendingUp,
  Star,
  ArrowRight,
  Trophy,
  Zap,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react';
import {
  getLeague,
  getUsers,
  getRosters,
  getAllPlayers,
  buildTeams,
  enrichPlayers,
  getScoringLabel,
  getPositionColor,
  getDraftClassColor,
  formatPoints,
  getSeasonProjections,
  getSeasonStats,
} from '@/lib/sleeper';
import type { TeamData, EnrichedPlayer } from '@/types/sleeper';

export const revalidate = 300;

async function fetchHomeData() {
  const [league, users, rosters, playersMap, projections, prevStats] = await Promise.all([
    getLeague(),
    getUsers(),
    getRosters(),
    getAllPlayers(),
    getSeasonProjections(2026),
    getSeasonStats(2025),
  ]);
  const teams = buildTeams(rosters, users);
  const allPlayers = enrichPlayers(playersMap, rosters, teams);

  const projMap = new Map<string, number>();
  for (const [pid, d] of Object.entries(prevStats)) {
    if (d.pts_ppr != null) projMap.set(pid, d.pts_ppr);
  }
  for (const [pid, d] of Object.entries(projections)) {
    if (d.pts_ppr != null) projMap.set(pid, d.pts_ppr);
  }

  const freeAgents = allPlayers
    .filter((p) => !p.isProtected && (p.search_rank != null || projMap.has(p.player_id)))
    .map((p) => ({ ...p, projectedPts: projMap.get(p.player_id) }))
    .sort((a, b) => {
      if (a.projectedPts != null && b.projectedPts != null) return b.projectedPts - a.projectedPts;
      if (a.projectedPts != null) return -1;
      if (b.projectedPts != null) return 1;
      return (a.search_rank ?? 999999) - (b.search_rank ?? 999999);
    })
    .slice(0, 6);
  return { league, teams, freeAgents, allPlayers };
}

export default async function HomePage() {
  try {
    const { league, teams, freeAgents, allPlayers } = await fetchHomeData();
    const scoring = getScoringLabel(league.scoring_settings);
    const totalPlayers = allPlayers.length;
    const protectedCount = allPlayers.filter((p) => p.isProtected).length;
    const freeAgentCount = totalPlayers - protectedCount;

    return (
      <div>
        <HeroSection
          leagueName={league.name}
          season={league.season}
          scoring={scoring}
          status={league.status}
        />
        <div className="page-container space-y-10">
          <QuickStats
            teamCount={teams.length}
            totalPlayers={totalPlayers}
            freeAgents={freeAgentCount}
            scoring={scoring}
            season={league.season}
          />
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <StandingsTable teams={teams} />
            </div>
            <div className="lg:col-span-2">
              <TopFreeAgents players={freeAgents} />
            </div>
          </div>
          <FeatureCards />
        </div>
      </div>
    );
  } catch (err) {
    return <ErrorBanner />;
  }
}

function HeroSection({
  leagueName,
  season,
  scoring,
  status,
}: {
  leagueName: string;
  season: string;
  scoring: string;
  status: string;
}) {
  const statusLabel: Record<string, string> = {
    pre_draft: 'Pre-Draft',
    drafting: 'Draft in Progress',
    in_season: 'Season Active',
    complete: 'Season Complete',
  };

  return (
    <div className="gradient-hero border-b border-zinc-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-green-400 font-black text-8xl select-none"
            style={{
              top: `${(i * 31) % 100}%`,
              left: `${(i * 23 + 10) % 100}%`,
              opacity: 0.3,
              transform: `rotate(${i * 15}deg)`,
            }}
          >
            🏈
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-600/20 border border-green-600/30 text-green-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {statusLabel[status] ?? status}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              2024+ Draft Class Only
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-none mb-3">
            {leagueName}
          </h1>
          <p className="text-zinc-400 text-lg font-medium mt-2">
            {season} Season &nbsp;·&nbsp; Dynasty &nbsp;·&nbsp; {scoring}
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              href="/free-agents"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
            >
              <Star size={15} />
              Best Available
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm border border-zinc-700 transition-colors"
            >
              <Users size={15} />
              View Teams
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStats({
  teamCount,
  totalPlayers,
  freeAgents,
  scoring,
  season,
}: {
  teamCount: number;
  totalPlayers: number;
  freeAgents: number;
  scoring: string;
  season: string;
}) {
  const stats = [
    { label: 'Teams', value: String(teamCount), icon: Users, color: 'text-blue-400' },
    { label: 'Eligible Players', value: String(totalPlayers), icon: TrendingUp, color: 'text-green-400' },
    { label: 'Free Agents', value: String(freeAgents), icon: Star, color: 'text-amber-400' },
    { label: 'Scoring', value: scoring, icon: Zap, color: 'text-purple-400' },
    { label: 'Season', value: season, icon: Clock, color: 'text-cyan-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <s.icon size={18} className={s.color} />
          <span className="text-2xl font-bold text-white">{s.value}</span>
          <span className="text-zinc-500 text-xs font-medium">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function StandingsTable({ teams }: { teams: TeamData[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <h2 className="font-bold text-white">Standings</h2>
        </div>
        <Link
          href="/teams"
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          All teams <ArrowRight size={12} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-3 py-3 font-medium">Team</th>
              <th className="text-center px-3 py-3 font-medium">W</th>
              <th className="text-center px-3 py-3 font-medium">L</th>
              <th className="text-right px-3 py-3 font-medium">PF</th>
              <th className="text-right px-5 py-3 font-medium hidden sm:table-cell">PA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {teams.map((t, i) => (
              <tr key={t.roster.roster_id} className="table-row-hover">
                <td className="px-5 py-3 text-zinc-500 font-medium tabular-nums">{i + 1}</td>
                <td className="px-3 py-3">
                  <div>
                    <span className="text-white font-semibold text-sm">{t.teamName}</span>
                    <p className="text-zinc-600 text-xs">{t.ownerName}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-green-400 font-bold tabular-nums">
                  {t.wins}
                </td>
                <td className="px-3 py-3 text-center text-red-400 font-medium tabular-nums">
                  {t.losses}
                </td>
                <td className="px-3 py-3 text-right text-zinc-300 font-medium tabular-nums">
                  {formatPoints(t.pointsFor)}
                </td>
                <td className="px-5 py-3 text-right text-zinc-500 tabular-nums hidden sm:table-cell">
                  {formatPoints(t.pointsAgainst)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopFreeAgents({ players }: { players: EnrichedPlayer[] }) {
  return (
    <div className="card overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-green-400" />
          <h2 className="font-bold text-white">Top Free Agents</h2>
        </div>
        <Link
          href="/free-agents"
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          See all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {players.length === 0 ? (
          <p className="px-5 py-8 text-zinc-500 text-sm text-center">No free agents found.</p>
        ) : (
          players.map((p, i) => (
            <div key={p.player_id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/40 transition-colors">
              <span className="text-zinc-600 text-sm font-bold w-5 text-center tabular-nums">{i + 1}</span>
              <span
                className={`pos-badge ${getPositionColor(p.position)}`}
                style={{ minWidth: 28, justifyContent: 'center' }}
              >
                {p.position}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{p.full_name}</p>
                <p className="text-zinc-500 text-xs truncate">{p.team ?? 'FA'}</p>
              </div>
              <span className={`class-badge ${getDraftClassColor(p.draftClass)}`}>
                &apos;{String(p.draftClass).slice(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FeatureCards() {
  const cards = [
    {
      href: '/free-agents',
      icon: Star,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      title: 'Best Available',
      desc: 'Ranked free agents from the 2024+ draft class, filtered and ready to pick up.',
    },
    {
      href: '/teams',
      icon: Shield,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      title: 'Team Rosters',
      desc: "Explore every team's protected players, records, and roster composition.",
    },
    {
      href: '/history',
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      title: 'League History',
      desc: 'Past champions, season results, and all-time league records.',
    },
    {
      href: '/stats',
      icon: BarChart3,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      title: 'League Stats',
      desc: 'Draft class breakdowns, position leaderboards, and team analytics.',
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="card-hover p-5 flex flex-col gap-3 group"
        >
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.bg}`}>
            <c.icon size={20} className={c.color} />
          </span>
          <div>
            <h3 className="font-bold text-white group-hover:text-green-400 transition-colors">
              {c.title}
            </h3>
            <p className="text-zinc-500 text-sm mt-1 leading-relaxed">{c.desc}</p>
          </div>
          <span className="text-green-500 text-xs font-semibold flex items-center gap-1 mt-auto">
            Explore <ArrowRight size={11} />
          </span>
        </Link>
      ))}
    </div>
  );
}

function ErrorBanner() {
  return (
    <div className="page-container">
      <div className="card p-10 text-center max-w-lg mx-auto mt-10">
        <Trophy size={40} className="text-zinc-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to load league data</h2>
        <p className="text-zinc-500 text-sm mb-6">
          The Sleeper API may be temporarily unavailable. Please try refreshing the page.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors"
        >
          Refresh
        </a>
      </div>
    </div>
  );
}
