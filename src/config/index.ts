import dotenv from 'dotenv';
import path from 'path';

// Nạp cấu hình từ .env
dotenv.config();

export interface AppConfig {
  githubToken: string;
  helperGithubToken?: string;
  targetRepo: string;
  sharkQuota: number;
  galaxyQuota: number;
  pairQuota: number;
  requestDelayMs: number;
  port: number;
}

export function getConfig(): AppConfig {
  return {
    githubToken: process.env.GITHUB_TOKEN?.trim() || '',
    helperGithubToken: process.env.HELPER_GITHUB_TOKEN?.trim() || '',
    targetRepo: process.env.TARGET_REPO?.trim() || 'github-trophy-vault',
    sharkQuota: parseInt(process.env.SHARK_QUOTA || '128', 10),
    galaxyQuota: parseInt(process.env.GALAXY_QUOTA || '32', 10),
    pairQuota: parseInt(process.env.PAIR_QUOTA || '16', 10),
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '2000', 10),
    port: parseInt(process.env.PORT || '3456', 10),
  };
}
