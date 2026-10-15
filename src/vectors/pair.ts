import { GitHubService } from '../services/github';
import { VectorExecutionSummary, VectorOptions } from '../types';
import { BaseVector } from './base';

export class PairExtraordinaireVector extends BaseVector {
  public readonly name = 'Pair Vector';
  public readonly description = 'Co-author a commit in a merged Pull Request for Pair Extraordinaire';

  private helperGithub?: GitHubService;

  constructor(targetGithub: GitHubService, helperGithub?: GitHubService) {
    super(targetGithub);
    this.helperGithub = helperGithub;
  }

  public async execute(options: VectorOptions): Promise<VectorExecutionSummary> {
    const startTime = Date.now();
    const quota = options.quota || 1;
    const delay = options.delayMs || 2000;
    let itemsProcessed = 0;

    this.log(options, 'PAYLOAD', `Khởi động Pair Vector -> Tạo commit đồng tác giả (Co-authored commit) trong PR merged...`);

    const user = await this.github.getAuthenticatedUser();
    const repo = await this.github.ensureRepository(options.repoName);

    // Xác định thông tin cộng tác viên:
    // Cần email chuẩn kèm ID (ví dụ: ID+username@users.noreply.github.com)
    // để GitHub link chính xác account và hiển thị 2 avatar trên commit.
    let partnerUser = options.helperUsername || 'octocat';
    let partnerEmail = `${partnerUser}@users.noreply.github.com`;

    if (this.helperGithub) {
      try {
        const helper = await this.helperGithub.getAuthenticatedUser();
        partnerUser = helper.login;
        partnerEmail = `${helper.id}+${helper.login}@users.noreply.github.com`;
      } catch {
        // Giữ fallback nếu helper token gặp lỗi
      }
    }

    for (let i = 1; i <= quota; i++) {
      try {
        const branchName = `pair-collab-${Date.now()}-${i}`;
        const defaultSha = await this.github.getDefaultBranchSha(user.login, repo.name, repo.default_branch);

        await this.github.createBranch(user.login, repo.name, branchName, defaultSha);

        // Commit có kèm Co-authored-by theo định dạng chuẩn của GitHub
        const commitMessage = `feat: pair programming harvest sync #${i}\n\nCo-authored-by: ${partnerUser} <${partnerEmail}>`;

        await this.github.createOrUpdateFile({
          owner: user.login,
          repo: repo.name,
          path: `data/pair-collab-${Date.now()}-${i}.md`,
          message: commitMessage,
          content: `# Pair Extraordinaire Collaboration Record #${i}\n\nCo-authors: @${user.login} & @${partnerUser}`,
          branch: branchName,
        });

        const pr = await this.github.createPullRequest({
          owner: user.login,
          repo: repo.name,
          title: `feat(pair): collaboration sequence #${i} with @${partnerUser}`,
          head: branchName,
          base: repo.default_branch,
          body: `Pull request featuring co-authored commits with @${partnerUser}.`,
        });

        this.log(options, 'INFO', `PR #${pr.number} đã tạo kèm Co-authored-by tag. Đang merge...`);
        await this.sleep(1500);

        await this.github.mergePullRequest({
          owner: user.login,
          repo: repo.name,
          pullNumber: pr.number,
          commitTitle: `Merge pull request #${pr.number} (Pair Extraordinaire Sequence)`,
          mergeMethod: 'merge', // Dùng merge commit để bảo toàn metadata commit
        });

        itemsProcessed++;
        this.log(options, 'OK', `PR #${pr.number} đã merge thành công! Kích hoạt huy hiệu Pair Extraordinaire cho cả 2 tác giả.`);

        await this.github.deleteBranch(user.login, repo.name, branchName);

        if (i < quota) {
          await this.sleep(delay);
        }
      } catch (err: any) {
        this.log(options, 'ERROR', `Lỗi chu kỳ Pair #${i}: ${err.message}`);
        await this.sleep(4000);
      }
    }

    return {
      vector: this.name,
      success: itemsProcessed > 0,
      unlocked: itemsProcessed > 0,
      itemsProcessed,
      targetQuota: quota,
      details: `Đã hoàn thành ${itemsProcessed}/${quota} PRs có co-authored commits.`,
      durationMs: Date.now() - startTime,
    };
  }
}
