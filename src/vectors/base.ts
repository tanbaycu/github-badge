import { GitHubService } from '../services/github';
import { VectorExecutionSummary, VectorLogEntry, VectorOptions } from '../types';

export abstract class BaseVector {
  public abstract readonly name: string;
  public abstract readonly description: string;
  protected github: GitHubService;

  constructor(github: GitHubService) {
    this.github = github;
  }

  public abstract execute(options: VectorOptions): Promise<VectorExecutionSummary>;

  protected log(options: VectorOptions, level: VectorLogEntry['level'], message: string, data?: any): void {
    const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    const entry: VectorLogEntry = {
      timestamp,
      level,
      vector: this.name,
      message,
      data,
    };

    if (options.onProgress) {
      options.onProgress(entry);
    } else {
      // Mặc định in ra console theo format của GitTrophy
      console.log(`[${timestamp}] [${level}] [${this.name}] ${message}`);
    }
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
