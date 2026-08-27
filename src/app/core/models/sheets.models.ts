export interface SheetsMetadata {
  title: string;
  sheetId: number;
}

export interface Summary {
  games_played: number;
  overall_winrate: number;
}

export interface RoleStats {
  role: string;
  games: number;
  winrate: number;
  category: string;
}

export interface CategoryStats {
  category: string;
  games: number;
  winrate: number;
}

export interface TeamStats {
  team: string;
  games: number;
  winrate: number;
}

export interface LogEntry {
  date: string;
  role: string;
  win: number;
  role_note: string;
  role_note_norm: string;
  category: string;
  team: string;
  role_clean?: string;
}

export interface PlayerSheetResponse {
  summary: Summary;
  by_role: RoleStats[];
  by_category: CategoryStats[];
  by_team: TeamStats[];
  log: LogEntry[];
}