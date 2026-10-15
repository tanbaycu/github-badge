/**
 * Định nghĩa các kiểu dữ liệu cho GitTrophy Hunter Engine
 */

export type AchievementId = 
  | 'pull-shark'
  | 'galaxy-brain'
  | 'pair-extraordinaire'
  | 'quickdraw'
  | 'yolo'
  | 'public-sponsor'
  | 'starstruck';

export type AchievementStatus = 'ACQUIRED' | 'HUNTABLE' | 'LOCKED';

export type AchievementTier = 
  | 'Default' 
  | 'Bronze' 
  | 'Bronze (x2)' 
  | 'Bronze (x16)'
  | 'Silver' 
  | 'Silver (x2)'
  | 'Silver (x3)'
  | 'Gold' 
  | 'Gold (x2)' 
  | 'Gold (x3)' 
  | 'Gold (x4)';

export interface AchievementItem {
  id: AchievementId;
  name: string;
  tier: AchievementTier;
  status: AchievementStatus;
  description: string;
  currentCount?: number;
  targetQuota?: number;
  icon?: string;
  badgeColor?: string;
}

export interface ReconProfileReport {
  username: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  publicRepos: number;
  followers: number;
  achievements: AchievementItem[];
  scannedAt: string;
}

export interface VectorOptions {
  repoName: string;
  quota?: number;
  targetUsername?: string;
  helperUsername?: string;
  delayMs?: number;
  onProgress?: (log: VectorLogEntry) => void;
}

export type LogLevel = 'INFO' | 'OK' | 'WARN' | 'ERROR' | 'PAYLOAD' | 'DEBUG';

export interface VectorLogEntry {
  timestamp: string;
  level: LogLevel;
  vector: string;
  message: string;
  data?: any;
}

export interface VectorExecutionSummary {
  vector: string;
  success: boolean;
  unlocked: boolean;
  itemsProcessed: number;
  targetQuota: number;
  details: string;
  durationMs: number;
}
