export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  status: 'pre_draft' | 'drafting' | 'in_season' | 'complete';
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  settings: {
    num_teams: number;
    playoff_teams: number;
    playoff_week_start: number;
    trade_deadline: number;
    waiver_type: number;
    waiver_budget: number;
    max_keepers: number;
    league_average_match: number;
    daily_waivers_last_ran: number;
    last_scored_leg: number;
    leg: number;
  };
  previous_league_id: string | null;
  draft_id: string;
  total_rosters: number;
  sport: string;
  avatar: string | null;
  metadata?: {
    keeper_deadline?: string;
    auto_continue?: string;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  metadata: {
    team_name?: string;
    team_name_update?: string;
    avatar?: string;
    mention_pn?: string;
  };
  avatar: string | null;
  is_bot?: boolean;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  co_owners?: string[];
  league_id: string;
  players: string[];
  starters: string[];
  reserve: string[] | null;
  taxi: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal: number;
    fpts_against: number;
    fpts_against_decimal: number;
    max_points: number;
    max_points_decimal: number;
    rank: number;
    ppts: number;
    ppts_decimal: number;
    waiver_position: number;
    waiver_budget_used: number;
    total_moves: number;
  };
  metadata?: {
    streak?: string;
    record?: string;
  };
}

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  fantasy_positions: string[];
  team: string | null;
  age: number | null;
  years_exp: number;
  college: string | null;
  number: number | null;
  height: string | null;
  weight: string | null;
  birth_date: string | null;
  injury_status: string | null;
  injury_notes: string | null;
  search_rank: number | null;
  search_full_name: string;
  hashtag: string | null;
  depth_chart_position: string | null;
  depth_chart_order: number | null;
  rotowire_id: number | null;
  rotoworld_id: number | null;
  stats_id: string | null;
  sportradar_id: string | null;
  espn_id: number | null;
  active: boolean;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  status: string;
  type: string;
  sport: string;
  season: string;
  season_type: string;
  created: number;
  last_modified: number;
  start_time: number | null;
  settings: {
    teams: number;
    rounds: number;
    pick_timer: number;
    slots_qb: number;
    slots_rb: number;
    slots_wr: number;
    slots_te: number;
    slots_flex: number;
    slots_k: number;
    slots_def: number;
    slots_bn: number;
  };
  draft_order: Record<string, number> | null;
  slot_to_roster_id: Record<string, number> | null;
}

export interface TeamData {
  roster: SleeperRoster;
  user: SleeperUser;
  teamName: string;
  ownerName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  streak?: string;
}

export interface EnrichedPlayer extends SleeperPlayer {
  fantasyTeamId?: number;
  fantasyTeamName?: string;
  isProtected: boolean;
  draftClass: number;
}

export const POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
export type Position = typeof POSITIONS[number];
