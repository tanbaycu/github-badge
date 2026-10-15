import { VectorExecutionSummary, VectorOptions } from '../types';
import { BaseVector } from './base';

export class QuickdrawVector extends BaseVector {
  public readonly name = 'Quickdraw Vector';
  public readonly description = 'Close an Issue or Pull Request within 5 minutes of opening (target < 5 seconds)';

  public async execute(options: VectorOptions): Promise<VectorExecutionSummary> {
    const startTime = Date.now();
    this.log(options, 'PAYLOAD', 'Quickdraw Vector -> Khởi tạo quy trình spawn issue tức thời...');

    const user = await this.github.getAuthenticatedUser();
    const repo = await this.github.ensureRepository(options.repoName);

    // 1. Tạo issue
    const issue = await this.github.createIssue(
      user.login,
      repo.name,
      `[Quickdraw Test #${Date.now()}] Instantaneous event closure verification`,
      'Automated issue payload designed to verify sub-5-minute closure for the Quickdraw trophy.'
    );

    this.log(options, 'INFO', `Issue #${issue.number} đã khởi tạo. Chờ 2.5s để đồng bộ luồng sự kiện GitHub...`);
    await this.sleep(2500);

    // 2. Đóng issue ngay lập tức (< 5 giây)
    await this.github.closeIssue(user.login, repo.name, issue.number);
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    this.log(options, 'OK', `Issue #${issue.number} đã đóng thành công (< ${durationSec}s). Tín hiệu Quickdraw đã được gửi!`);

    return {
      vector: this.name,
      success: true,
      unlocked: true,
      itemsProcessed: 1,
      targetQuota: 1,
      details: `Đã đóng Issue #${issue.number} trong vòng ${durationSec} giây.`,
      durationMs: Date.now() - startTime,
    };
  }
}
