export interface Summary {
  games_played: number;
  overall_winrate: number;
}

export interface RoleStats {
  role: string;
  games: number;
  winrate: number;
}

export interface CategoryStats {
  role: string;
  games: number;
  winrate: number;
}

export interface TeamStats {
  role: string;
  games: number;
  winrate: number;
}

export interface LogEntry {
  date: string;
  role: string;
  win: number;
  role_clean: string;
  role_note: string;
  role_note_norm: string;
  category: string;
  team: string;
}

export interface PlayerSheetResponse {
  summary: Summary;
  by_role: RoleStats[];
  by_category: CategoryStats[];
  by_team: TeamStats[];
  log: LogEntry[];
}