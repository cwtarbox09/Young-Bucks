import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperPlayer,
  SleeperDraft,
  TeamData,
  EnrichedPlayer,
} from '@/types/sleeper';

export const LEAGUE_ID = '1312075391149572096';
const BASE = 'https://api.sleeper.app/v1';

// The league only allows 2024+ draft class.
// In the 2026 offseason: 2024 class = years_exp 2, 2025 class = years_exp 1, 2026 rookies = years_exp 0.
export const MAX_YEARS_EXP = 2;
export const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

async function sleeperFetch<T>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Sleeper API error: ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getLeague(): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${LEAGUE_ID}`);
}

export async function getUsers(): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${LEAGUE_ID}/users`);
}

export async function getRosters(): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${LEAGUE_ID}/rosters`);
}

export async function getDrafts(): Promise<SleeperDraft[]> {
  return sleeperFetch<SleeperDraft[]>(`/league/${LEAGUE_ID}/drafts`);
}

export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return sleeperFetch<Record<string, SleeperPlayer>>('/players/nfl', 86400);
}

export async function getSeasonProjections(
  year: number
): Promise<Record<string, { pts_ppr?: number }>> {
  try {
    const data = await sleeperFetch<Record<string, { pts_ppr?: number }> | null>(
      `/projections/nfl/regular/${year}`,
      3600
    );
    return data ?? {};
  } catch {
    return {};
  }
}

export async function getSeasonStats(
  year: number
): Promise<Record<string, { pts_ppr?: number }>> {
  try {
    const data = await sleeperFetch<Record<string, { pts_ppr?: number }> | null>(
      `/stats/nfl/regular/${year}`,
      3600
    );
    return data ?? {};
  } catch {
    return {};
  }
}

export async function getPreviousLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`, 3600);
}

export async function getPreviousRosters(leagueId: string): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`, 3600);
}

export async function getPreviousUsers(leagueId: string): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`, 3600);
}

export interface SleeperBracketMatchup {
  r: number;   // round
  m: number;   // matchup id within round
  t1: number | null;
  t2: number | null;
  w: number | null;  // roster_id of winner
  l: number | null;  // roster_id of loser
  p: number;   // final placement awarded to winner (1 = champion)
}

export async function getWinnersBracket(leagueId: string): Promise<SleeperBracketMatchup[]> {
  return sleeperFetch<SleeperBracketMatchup[]>(`/league/${leagueId}/winners_bracket`, 3600);
}

export async function getLosersBracket(leagueId: string): Promise<SleeperBracketMatchup[]> {
  return sleeperFetch<SleeperBracketMatchup[]>(`/league/${leagueId}/losers_bracket`, 3600);
}

// Returns the roster_id of the champion from a completed league's winners bracket.
// The championship game is the matchup whose winner receives placement 1.
export function findChampionRosterId(bracket: SleeperBracketMatchup[]): number | null {
  const final = bracket.find((m) => m.p === 1);
  return final?.w ?? null;
}

// Builds a map of rosterId → final placement from winners + losers brackets.
// Championship game (p=1): winner=1st, loser=2nd.
// All other terminal matchups: winner=p, loser=p+1.
export function buildPlacementMap(
  winnersBracket: SleeperBracketMatchup[],
  losersBracket: SleeperBracketMatchup[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const m of [...winnersBracket, ...losersBracket]) {
    if (m.w == null) continue;
    map.set(m.w, m.p);
    if (m.l != null) map.set(m.l, m.p + 1);
  }
  return map;
}

export function buildTeams(rosters: SleeperRoster[], users: SleeperUser[]): TeamData[] {
  const userMap = new Map(users.map((u) => [u.user_id, u]));

  return rosters
    .map((roster) => {
      const user = userMap.get(roster.owner_id);
      const wins = roster.settings?.wins ?? 0;
      const losses = roster.settings?.losses ?? 0;
      const ties = roster.settings?.ties ?? 0;
      const pointsFor =
        (roster.settings?.fpts ?? 0) + (roster.settings?.fpts_decimal ?? 0) / 100;
      const pointsAgainst =
        (roster.settings?.fpts_against ?? 0) +
        (roster.settings?.fpts_against_decimal ?? 0) / 100;

      return {
        roster,
        user: user!,
        teamName:
          user?.metadata?.team_name ||
          user?.metadata?.team_name_update ||
          user?.display_name ||
          `Team ${roster.roster_id}`,
        ownerName: user?.display_name ?? 'Unknown',
        wins,
        losses,
        ties,
        pointsFor,
        pointsAgainst,
        rank: roster.settings?.rank ?? 99,
        streak: roster.metadata?.streak,
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export function enrichPlayers(
  playersMap: Record<string, SleeperPlayer>,
  rosters: SleeperRoster[],
  teams: TeamData[]
): EnrichedPlayer[] {
  const rosterToTeam = new Map(teams.map((t) => [t.roster.roster_id, t]));
  const playerToRoster = new Map<string, number>();

  for (const roster of rosters) {
    for (const pid of roster.players ?? []) {
      playerToRoster.set(pid, roster.roster_id);
    }
  }

  return Object.values(playersMap)
    .filter(
      (p) =>
        p.active !== false &&
        FANTASY_POSITIONS.has(p.position) &&
        p.years_exp != null &&
        p.years_exp <= MAX_YEARS_EXP
    )
    .map((p) => {
      const rosterId = playerToRoster.get(p.player_id);
      const team = rosterId != null ? rosterToTeam.get(rosterId) : undefined;
      return {
        ...p,
        isProtected: rosterId != null,
        fantasyTeamId: rosterId,
        fantasyTeamName: team?.teamName,
        draftClass: getDraftClass(p.years_exp),
      };
    });
}

function getDraftClass(yearsExp: number): number {
  // In 2026 offseason: 0 = 2026 rookies, 1 = 2025 class, 2 = 2024 class
  const currentYear = 2026;
  return currentYear - yearsExp;
}

export function getPositionColor(position: string): string {
  switch (position) {
    case 'QB':
      return 'text-red-400 bg-red-500/15 border-red-500/30';
    case 'RB':
      return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
    case 'WR':
      return 'text-green-400 bg-green-500/15 border-green-500/30';
    case 'TE':
      return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
    default:
      return 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30';
  }
}

export function getDraftClassColor(year: number): string {
  switch (year) {
    case 2024:
      return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    case 2025:
      return 'text-purple-400 bg-purple-500/15 border-purple-500/30';
    case 2026:
      return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
    default:
      return 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30';
  }
}

export function getInjuryColor(status: string | null): string {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'out':
      return 'text-red-400';
    case 'doubtful':
      return 'text-red-300';
    case 'questionable':
      return 'text-yellow-400';
    case 'ir':
      return 'text-red-500';
    default:
      return 'text-zinc-400';
  }
}

export function formatPoints(pts: number): string {
  return pts.toFixed(2);
}

export function getScoringLabel(settings: Record<string, number>): string {
  if (settings.rec === 1) return 'PPR';
  if (settings.rec === 0.5) return 'Half PPR';
  if (!settings.rec) return 'Standard';
  return 'Custom';
}
