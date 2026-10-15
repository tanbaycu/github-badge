/**
 * TrophyHunterEngine - Bộ điều phối trung tâm cho toàn bộ chiến dịch săn huy hiệu GitHub
 */

import { AppConfig, getConfig } from '../config';
import { GitHubService, GitHubUser } from '../services/github';
import { ReconScanner } from '../services/recon';
import { ReconProfileReport, VectorExecutionSummary, VectorLogEntry } from '../types';
import { GalaxyBrainVector } from '../vectors/galaxy';
import { PairExtraordinaireVector } from '../vectors/pair';
import { PullSharkVector } from '../vectors/shark';
import { QuickdrawVector } from '../vectors/quickdraw';
import { YoloVector } from '../vectors/yolo';
import { Reporter } from './reporter';

export interface EngineRunOptions {
  vectors?: ('quickdraw' | 'yolo' | 'pair' | 'shark' | 'galaxy')[];
  reconOnly?: boolean;
  onLog?: (log: VectorLogEntry) => void;
  sharkQuota?: number;
  galaxyQuota?: number;
  pairQuota?: number;
}

export class TrophyHunterEngine {
  private config: AppConfig;
  private targetGithub!: GitHubService;
  private helperGithub?: GitHubService;
  private scanner!: ReconScanner;
  private targetUser!: GitHubUser;
  private helperUser?: GitHubUser;

  constructor(configOverride?: Partial<AppConfig>) {
    this.config = { ...getConfig(), ...configOverride };
  }

  /**
   * Xác thực danh tính và token GitHub
   */
  public async authenticate(onLog?: (log: VectorLogEntry) => void): Promise<GitHubUser> {
    const notify = (level: VectorLogEntry['level'], msg: string) => {
      const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
      if (onLog) {
        onLog({ timestamp, level, vector: 'ENGINE', message: msg });
      } else {
        Reporter.formatLog(timestamp, level, msg);
      }
    };

    notify('INFO', 'Verifying token authenticity and identity credentials...');

    if (!this.config.githubToken) {
      throw new Error(
        'GITHUB_TOKEN không được tìm thấy! Vui lòng cấu hình biến môi trường GITHUB_TOKEN trong file .env'
      );
    }

    this.targetGithub = new GitHubService(this.config.githubToken);
    this.targetUser = await this.targetGithub.getAuthenticatedUser();
    this.scanner = new ReconScanner(this.targetGithub);

    notify('OK', `Authenticated as ${this.targetUser.login} (${this.targetUser.name || 'Anonymous'})`);

    // Kiểm tra Helper Token nếu có (hỗ trợ nhiều token cách nhau bằng dấu |)
    if (this.config.helperGithubToken) {
      const helperTokens = this.config.helperGithubToken
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean);

      if (helperTokens.length > 0) {
        let authenticatedCount = 0;
        for (const token of helperTokens) {
          try {
            const gh = new GitHubService(token);
            const u = await gh.getAuthenticatedUser();
            if (!this.helperGithub) {
              this.helperGithub = gh;
              this.helperUser = u;
            }
            authenticatedCount++;
            notify('OK', `Helper clone authenticated as @${u.login} (${authenticatedCount}/${helperTokens.length} nicks ready)`);
          } catch (err: any) {
            notify('WARN', `Helper token (${token.slice(0, 6)}...) không hợp lệ: ${err.message}`);
          }
        }
        if (authenticatedCount > 1) {
          notify('OK', `Multi-Token Bypass Active: ${authenticatedCount} nick phụ sẵn sàng luân chuyển.`);
        }
      }
    }

    return this.targetUser;
  }

  /**
   * Quét và tạo báo cáo thành tựu
   */
  public async scan(username?: string): Promise<ReconProfileReport> {
    const target = username || this.targetUser?.login;
    return this.scanner.scanProfile(target);
  }

  /**
   * Khởi chạy toàn bộ chu trình săn huy hiệu
   */
  public async run(options: EngineRunOptions = {}): Promise<VectorExecutionSummary[]> {
    const user = await this.authenticate(options.onLog);

    // In Banner giao diện hacker
    if (!options.onLog) {
      Reporter.printBanner(user.login);
    }

    // Quét Recon
    const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    if (options.onLog) {
      options.onLog({
        timestamp,
        level: 'INFO',
        vector: 'RECON',
        message: `Scanning profile @${user.login} for active trophies and achievements...`,
      });
    } else {
      Reporter.formatLog(timestamp, 'INFO', `Scanning profile @${user.login} for active trophies and achievements...`);
    }

    const report = await this.scan();
    if (!options.onLog) {
      Reporter.printReconReport(report);
    }

    if (options.reconOnly) {
      return [];
    }

    const sharkQuota = options.sharkQuota ?? this.config.sharkQuota;
    const galaxyQuota = options.galaxyQuota ?? this.config.galaxyQuota;
    const pairQuota = options.pairQuota ?? this.config.pairQuota;

    if (!options.onLog) {
      Reporter.printHarvestHeader(sharkQuota, pairQuota, galaxyQuota);
    }

    const results: VectorExecutionSummary[] = [];
    const vectorNames = options.vectors || ['quickdraw', 'yolo', 'pair', 'shark', 'galaxy'];

    const logProxy = (entry: VectorLogEntry) => {
      if (options.onLog) {
        options.onLog(entry);
      } else {
        Reporter.formatLog(entry.timestamp, entry.level, entry.message);
      }
    };

    const vectorOptions = {
      repoName: this.config.targetRepo,
      delayMs: this.config.requestDelayMs,
      targetUsername: user.login,
      helperUsername: this.helperUser?.login,
      onProgress: logProxy,
    };

    // 1. Quickdraw
    if (vectorNames.includes('quickdraw')) {
      const qd = new QuickdrawVector(this.targetGithub);
      const res = await qd.execute(vectorOptions);
      results.push(res);
      await this.targetGithub.sleep(1500);
    }

    // 2. YOLO
    if (vectorNames.includes('yolo')) {
      const yolo = new YoloVector(this.targetGithub);
      const res = await yolo.execute(vectorOptions);
      results.push(res);
      await this.targetGithub.sleep(1500);
    }

    // 3. Pair Extraordinaire
    if (vectorNames.includes('pair')) {
      const pair = new PairExtraordinaireVector(this.targetGithub, this.helperGithub);
      const res = await pair.execute({ ...vectorOptions, quota: pairQuota });
      results.push(res);
      await this.targetGithub.sleep(1500);
    }

    // 4. Pull Shark (PR merges)
    if (vectorNames.includes('shark')) {
      const shark = new PullSharkVector(this.targetGithub, this.helperGithub);
      const res = await shark.execute({ ...vectorOptions, quota: sharkQuota });
      results.push(res);
      await this.targetGithub.sleep(1500);
    }

    // 5. Galaxy Brain (Accepted discussion answers)
    if (vectorNames.includes('galaxy')) {
      const galaxy = new GalaxyBrainVector(this.targetGithub, this.helperGithub);
      const res = await galaxy.execute({ ...vectorOptions, quota: galaxyQuota });
      results.push(res);
    }

    return results;
  }
}
