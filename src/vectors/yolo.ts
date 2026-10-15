import { VectorExecutionSummary, VectorOptions } from '../types';
import { BaseVector } from './base';

export class YoloVector extends BaseVector {
  public readonly name = 'YOLO Vector';
  public readonly description = 'Merge a Pull Request without code review';

  public async execute(options: VectorOptions): Promise<VectorExecutionSummary> {
    const startTime = Date.now();
    this.log(options, 'PAYLOAD', 'YOLO Vector -> Thâm nhập nhánh chính qua việc merge PR trực tiếp không cần review...');

    const user = await this.github.getAuthenticatedUser();
    const repo = await this.github.ensureRepository(options.repoName);

    const branchName = `yolo-infiltrate-${Date.now()}`;
    const defaultSha = await this.github.getDefaultBranchSha(user.login, repo.name, repo.default_branch);

    // 1. Tạo nhánh mới
    await this.github.createBranch(user.login, repo.name, branchName, defaultSha);

    // 2. Commit payload
    await this.github.createOrUpdateFile({
      owner: user.login,
      repo: repo.name,
      path: `yolo-${Date.now()}.txt`,
      message: 'feat(core): autonomous unreviewed deployment [skip ci]',
      content: 'Autonomous bypass test for YOLO achievement verification.',
      branch: branchName,
    });

    // 3. Tạo PR
    const pr = await this.github.createPullRequest({
      owner: user.login,
      repo: repo.name,
      title: 'feat: YOLO vector autonomous bypass pipeline',
      head: branchName,
      base: repo.default_branch,
      body: 'Autonomous unreviewed pull request for YOLO badge verification.',
    });

    this.log(options, 'INFO', `PR #${pr.number} đã tạo. Đang bỏ qua các lớp bảo vệ kiểm duyệt...`);
    await this.sleep(2000);

    // 4. Merge ngay mà không cần review
    await this.github.mergePullRequest({
      owner: user.login,
      repo: repo.name,
      pullNumber: pr.number,
      commitTitle: `Merge pull request #${pr.number} (YOLO autonomous merge)`,
      mergeMethod: 'squash',
    });

    this.log(options, 'OK', `PR #${pr.number} đã được merge vào ${repo.default_branch} mà không cần review. YOLO UNLOCKED!`);

    // Dọn dẹp nhánh
    await this.github.deleteBranch(user.login, repo.name, branchName);

    return {
      vector: this.name,
      success: true,
      unlocked: true,
      itemsProcessed: 1,
      targetQuota: 1,
      details: `Đã merge PR #${pr.number} trực tiếp không qua review.`,
      durationMs: Date.now() - startTime,
    };
  }
}
