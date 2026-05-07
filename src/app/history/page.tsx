import type { ElementType } from 'react';
import {
  getLeague,
  getUsers,
  getRosters,
  buildTeams,
  getPreviousLeague,
  getPreviousRosters,
  getPreviousUsers,
  getScoringLabel,
  formatPoints,
} from '@/lib/sleeper';
import { Trophy, Clock, Zap, Shield, Users, Star } from 'lucide-react';
import type { SleeperLeague, TeamData } from '@/types/sleeper';

export const revalidate = 3600;

export const metadata = {
  title: 'League History | Young Bucks Fantasy Hub',
};

interface SeasonSummary {
  league: SleeperLeague;
  teams: TeamData[];
  champion?: TeamData;
  runnerUp?: TeamData;
  topScorer?: TeamData;
}

async function buildSeasonHistory(): Promise<SeasonSummary[]> {
  const seasons: SeasonSummary[] = [];

  let currentLeague = await getLeague();
  let currentUsers = await getUsers();
  let currentRosters = await getRosters();

  const currentTeams = buildTeams(currentRosters, currentUsers);
  seasons.push({
    league: currentLeague,
    teams: currentTeams,
    champion: currentTeams.find((t) => t.rank === 1),
    topScorer: [...currentTeams].sort((a, b) => b.pointsFor - a.pointsFor)[0],
  });

  // Follow the chain of previous leagues (up to 5 seasons back)
  for (let i = 0; i < 5; i++) {
    const prevId = currentLeague.previous_league_id;
    if (!prevId) break;
    try {
      const [prevLeague, prevUsers, prevRosters] = await Promise.all([
        getPreviousLeague(prevId),
        getPreviousUsers(prevId),
        getPreviousRosters(prevId),
      ]);
      const prevTeams = buildTeams(prevRosters, prevUsers);
      seasons.push({
        league: prevLeague,
        teams: prevTeams,
        champion: prevTeams.find((t) => t.rank === 1),
        runnerUp: prevTeams.find((t) => t.rank === 2),
        topScorer: [...prevTeams].sort((a, b) => b.pointsFor - a.pointsFor)[0],
      });
      currentLeague = prevLeague;
      currentUsers = prevUsers;
      currentRosters = prevRosters;
    } catch {
      break;
    }
  }

  return seasons;
}

export default async function HistoryPage() {
  try {
    const [league, seasons] = await Promise.all([getLeague(), buildSeasonHistory()]);
    const scoring = getScoringLabel(league.scoring_settings);

    const allTimeTopScorer = seasons
      .flatMap((s) => s.teams)
      .sort((a, b) => b.pointsFor - a.pointsFor)[0];

    const allTimeWins = seasons
      .flatMap((s) => s.teams)
      .reduce<Record<string, { wins: number; losses: number; name: string }>>((acc, t) => {
        const key = t.ownerName;
        if (!acc[key]) acc[key] = { wins: 0, losses: 0, name: t.teamName };
        acc[key].wins += t.wins;
        acc[key].losses += t.losses;
        return acc;
      }, {});

    const allTimeLeader = Object.entries(allTimeWins)
      .sort(([, a], [, b]) => b.wins - a.wins)[0];

    const mostChampionships = seasons
      .filter((s) => s.league.status === 'complete' && s.champion)
      .reduce<Record<string, number>>((acc, s) => {
        const owner = s.champion!.ownerName;
        acc[owner] = (acc[owner] ?? 0) + 1;
        return acc;
      }, {});

    const champLeader = Object.entries(mostChampionships).sort(([, a], [, b]) => b - a)[0];

    const completedSeasons = seasons.filter((s) => s.league.status === 'complete' && s.champion);

    return (
      <div className="page-container space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={20} className="text-amber-400" />
            <h1 className="section-heading">League History</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Season-by-season records, past champions, and all-time milestones
          </p>
        </div>

        {/* League Info Banner */}
        <LeagueInfoBanner league={league} scoring={scoring} seasons={seasons.length} />

        {/* All-time records */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-amber-400" /> All-Time Records
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {champLeader && (
              <RecordCard
                icon={Trophy}
                iconColor="text-amber-400"
                bg="bg-amber-500/10"
                label="Most Championships"
                value={String(champLeader[1])}
                subLabel={champLeader[0]}
              />
            )}
            {allTimeTopScorer && (
              <RecordCard
                icon={Zap}
                iconColor="text-green-400"
                bg="bg-green-500/10"
                label="All-Time Top Scorer"
                value={formatPoints(allTimeTopScorer.pointsFor)}
                subLabel={`${allTimeTopScorer.teamName} (${allTimeTopScorer.ownerName})`}
              />
            )}
            {allTimeLeader && (
              <RecordCard
                icon={Shield}
                iconColor="text-blue-400"
                bg="bg-blue-500/10"
                label="Most Career Wins"
                value={String(allTimeLeader[1].wins)}
                subLabel={allTimeLeader[0]}
              />
            )}
          </div>
        </section>

        {/* Past Winners */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" /> Past Winners
          </h2>
          {completedSeasons.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSeasons.map((s) => (
                <PastWinnerCard key={s.league.league_id} summary={s} />
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-zinc-500 text-sm">
              No completed seasons yet.
            </div>
          )}
        </section>

        {/* Season by season */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-zinc-400" /> Season Results
          </h2>
          <div className="space-y-4">
            {seasons.map((s) => (
              <SeasonCard key={s.league.league_id} summary={s} />
            ))}
          </div>
        </section>

        {/* All-time standings */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-zinc-400" /> All-Time Standings
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-3 py-3 font-medium">Owner</th>
                    <th className="text-center px-3 py-3 font-medium">W</th>
                    <th className="text-center px-3 py-3 font-medium">L</th>
                    <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">
                      Win %
                    </th>
                    <th className="text-right px-5 py-3 font-medium hidden md:table-cell">
                      Championships
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {Object.entries(allTimeWins)
                    .sort(([, a], [, b]) => b.wins - a.wins)
                    .map(([owner, data], i) => {
                      const pct = data.wins + data.losses > 0
                        ? (data.wins / (data.wins + data.losses)) * 100
                        : 0;
                      const champs = mostChampionships[owner] ?? 0;
                      return (
                        <tr key={owner} className="table-row-hover">
                          <td className="px-5 py-3 text-zinc-500 font-medium">{i + 1}</td>
                          <td className="px-3 py-3">
                            <div>
                              <span className="text-white font-semibold">{owner}</span>
                              <p className="text-zinc-600 text-xs">{data.name}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-green-400 font-bold">
                            {data.wins}
                          </td>
                          <td className="px-3 py-3 text-center text-red-400 font-medium">
                            {data.losses}
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            <span
                              className={`text-sm font-semibold ${pct >= 50 ? 'text-green-400' : 'text-zinc-400'}`}
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right hidden md:table-cell">
                            {champs > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                                {[...Array(champs)].map((_, i) => (
                                  <Trophy key={i} size={14} />
                                ))}
                              </span>
                            ) : (
                              <span className="text-zinc-700">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  } catch {
    return (
      <div className="page-container">
        <div className="card p-10 text-center max-w-md mx-auto mt-10">
          <Trophy size={36} className="text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Could not load history</h2>
          <p className="text-zinc-500 text-sm">
            Sleeper API may be temporarily unavailable. Please refresh.
          </p>
        </div>
      </div>
    );
  }
}

function LeagueInfoBanner({
  league,
  scoring,
  seasons,
}: {
  league: SleeperLeague;
  scoring: string;
  seasons: number;
}) {
  const items = [
    { label: 'League Name', value: league.name },
    { label: 'Format', value: 'Dynasty (2024+ Class)' },
    { label: 'Scoring', value: scoring },
    { label: 'Teams', value: String(league.total_rosters) },
    { label: 'Seasons Played', value: String(seasons) },
    { label: 'Current Season', value: league.season },
  ];

  return (
    <div className="card p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-zinc-600 text-xs font-medium mb-0.5">{item.label}</p>
          <p className="text-white font-semibold text-sm">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function RecordCard({
  icon: Icon,
  iconColor,
  bg,
  label,
  value,
  subLabel,
}: {
  icon: ElementType;
  iconColor: string;
  bg: string;
  label: string;
  value: string;
  subLabel: string;
}) {
  return (
    <div className="card p-5 flex gap-4 items-start">
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} flex-shrink-0`}>
        <Icon size={20} className={iconColor} />
      </span>
      <div>
        <p className="text-zinc-500 text-xs font-medium mb-0.5">{label}</p>
        <p className="text-white text-2xl font-black">{value}</p>
        <p className="text-zinc-400 text-sm">{subLabel}</p>
      </div>
    </div>
  );
}

function PastWinnerCard({ summary: s }: { summary: SeasonSummary }) {
  const isTopScorer = s.champion && s.topScorer && s.topScorer.ownerName === s.champion.ownerName;
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -bottom-2 -right-2 opacity-[0.06]">
        <Trophy size={90} className="text-amber-400" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl font-black text-white">{s.league.season}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">
          Champion
        </span>
      </div>
      {s.champion && (
        <div>
          <p className="text-white font-bold text-lg leading-tight">{s.champion.teamName}</p>
          <p className="text-zinc-400 text-sm mb-3">{s.champion.ownerName}</p>
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-sm font-semibold">
              {s.champion.wins}-{s.champion.losses}
            </span>
            <span className="text-zinc-700 text-xs">
              {formatPoints(s.champion.pointsFor)} pts scored
            </span>
          </div>
          {isTopScorer && (
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
              <Zap size={10} /> Also Top Scorer
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SeasonCard({ summary: s }: { summary: SeasonSummary }) {
  const isComplete = s.league.status === 'complete';
  const statusColors: Record<string, string> = {
    complete: 'text-green-400 bg-green-500/10 border-green-500/20',
    in_season: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    pre_draft: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    drafting: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const statusLabel: Record<string, string> = {
    complete: 'Complete',
    in_season: 'In Progress',
    pre_draft: 'Pre-Draft',
    drafting: 'Drafting',
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">{s.league.season}</span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[s.league.status] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}
          >
            {statusLabel[s.league.status] ?? s.league.status}
          </span>
        </div>
        <span className="text-zinc-600 text-xs">{s.teams.length} teams</span>
      </div>

      <div className="p-5 grid sm:grid-cols-3 gap-4">
        {s.champion ? (
          <div className="sm:col-span-1">
            <p className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1">
              <Trophy size={11} /> {isComplete ? 'Champion' : 'Current Leader'}
            </p>
            <p className="text-white font-bold">{s.champion.teamName}</p>
            <p className="text-zinc-500 text-xs">{s.champion.ownerName}</p>
            <p className="text-green-400 text-sm font-semibold mt-0.5">
              {s.champion.wins}-{s.champion.losses}
            </p>
          </div>
        ) : (
          <div className="sm:col-span-1">
            <p className="text-zinc-600 text-sm">Season not yet complete</p>
          </div>
        )}

        {s.topScorer && (
          <div>
            <p className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1">
              <Zap size={11} /> Top Scorer
            </p>
            <p className="text-white font-bold">{s.topScorer.teamName}</p>
            <p className="text-zinc-500 text-xs">{s.topScorer.ownerName}</p>
            <p className="text-green-400 text-sm font-semibold mt-0.5">
              {formatPoints(s.topScorer.pointsFor)} pts
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-zinc-500 mb-1">Final Standings</p>
          <div className="space-y-1">
            {s.teams.slice(0, 4).map((t, i) => (
              <div key={t.roster.roster_id} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-600 w-3 tabular-nums">{i + 1}.</span>
                <span className="text-zinc-400 truncate">{t.teamName}</span>
                <span className="text-zinc-600 ml-auto tabular-nums">
                  {t.wins}-{t.losses}
                </span>
              </div>
            ))}
            {s.teams.length > 4 && (
              <p className="text-zinc-700 text-xs">+{s.teams.length - 4} more</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
