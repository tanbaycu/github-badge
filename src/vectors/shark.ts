import { GitHubService, GitHubUser } from '../services/github';
import { VectorExecutionSummary, VectorOptions } from '../types';
import { BaseVector } from './base';

export class PullSharkVector extends BaseVector {
  public readonly name = 'Shark Vector';
  public readonly description = 'Automated Pull Request cycle for Pull Shark (Bronze: 16, Silver: 128, Gold: 1024)';

  private helperGithub?: GitHubService;

  constructor(targetGithub: GitHubService, helperGithub?: GitHubService) {
    super(targetGithub);
    this.helperGithub = helperGithub;
  }

  public async execute(options: VectorOptions): Promise<VectorExecutionSummary> {
    const startTime = Date.now();
    const quota = options.quota || 128;
    const delay = options.delayMs || 2000;
    let itemsProcessed = 0;

    const targetUser = await this.github.getAuthenticatedUser();
    let helperUser: GitHubUser | undefined;
    if (this.helperGithub) {
      try {
        helperUser = await this.helperGithub.getAuthenticatedUser();
      } catch {
        helperUser = undefined;
      }
    }

    // Xác định chế độ chạy: Dual-Account (Cross-Repo) hay Single-Account
    // Mục đích giải pháp:
    // 1. GitHub áp dụng thuật toán Heuristic lọc các hành vi self-PR tự tạo tự merge siêu tốc trong cùng 1 repo cá nhân.
    // 2. Khi có tài khoản phụ (Helper), targetUser sẽ mở PR sang repo của Helper, và Helper thực hiện merge.
    //    GitHub sẽ ghi nhận đây là đóng góp ngoại bộ (External Open-Source Contribution) hợp lệ 100%.
    const isDualAccount = Boolean(
      this.helperGithub && helperUser && helperUser.login.toLowerCase() !== targetUser.login.toLowerCase()
    );

    let repoOwner: string;
    let repoName: string;
    let mergerGithub: GitHubService;

    if (isDualAccount && helperUser && this.helperGithub) {
      this.log(
        options,
        'INFO',
        `Phát hiện Helper Account @${helperUser.login}. Kích hoạt chế độ Dual-Token Cross-Repo chống bộ lọc Anti-Farming!`
      );
      // Helper chuẩn bị repository public
      const helperRepo = await this.helperGithub.ensureRepository(options.repoName);
      repoOwner = helperUser.login;
      repoName = helperRepo.name;
      mergerGithub = this.helperGithub;

      // Cấp quyền Collaborator cho targetUser để có thể đẩy nhánh lên repo của Helper
      try {
        await this.helperGithub.addCollaborator(repoOwner, repoName, targetUser.login, 'push');
        await this.sleep(1000);
        await this.github.acceptRepoInvitations(`${repoOwner}/${repoName}`);
      } catch (err: any) {
        this.log(options, 'WARN', `Thiết lập quyền Collaborator ghi nhận: ${err.message}. Tiếp tục xử lý...`);
      }
    } else {
      this.log(options, 'INFO', `Chạy ở chế độ Single-Account trên repository @${targetUser.login}/${options.repoName}`);
      const targetRepo = await this.github.ensureRepository(options.repoName);
      repoOwner = targetUser.login;
      repoName = targetRepo.name;
      mergerGithub = this.github;
    }

    this.log(
      options,
      'PAYLOAD',
      `Khởi động Shark Vector -> Mục tiêu: ${quota} PRs merged vào ${repoOwner}/${repoName} [Tác giả PR: @${targetUser.login}]`
    );

    // VÒNG LẶP CHÍNH: Dùng while (itemsProcessed < quota) kèm Retry per sequence
    // Lý do: Vòng lặp cũ 'for (let i = 1; i <= quota; i++)' khi gặp lỗi ở chu kỳ i sẽ bỏ qua luôn,
    // dẫn đến trường hợp thiếu PR (như 127/128). Vòng lặp while đảm bảo lặp đến khi đủ số lượng.
    while (itemsProcessed < quota) {
      const sequenceIndex = itemsProcessed + 1;
      let attempt = 0;
      const maxRetries = 3;
      let success = false;

      while (attempt < maxRetries && !success) {
        attempt++;
        const branchName = `trophy-shark-${Date.now()}-${sequenceIndex}`;

        try {
          const defaultSha = await this.github.getDefaultBranchSha(repoOwner, repoName);

          // 1. Tạo nhánh tạm bằng token của targetUser (người nhận huy hiệu)
          await this.github.createBranch(repoOwner, repoName, branchName, defaultSha);

          // 2. Commit nội dung mới lên nhánh
          const timestamp = new Date().toISOString();
          const payloadContent = `# Pull Shark Ledger Record\n\n- Index: ${sequenceIndex}/${quota}\n- Sync Time: ${timestamp}\n- Author: @${targetUser.login}\n- Agent: GitTrophy Hunter Engine\n- Hash: ${Math.random().toString(36).substring(2)}`;

          await this.github.createOrUpdateFile({
            owner: repoOwner,
            repo: repoName,
            path: `records/shark-run-${Date.now()}-${sequenceIndex}.md`,
            message: `chore(trophy): record harvest sequence #${sequenceIndex} [skip ci]`,
            content: payloadContent,
            branch: branchName,
          });

          // 3. Tạo Pull Request (Tác giả PR là targetUser)
          const pr = await this.github.createPullRequest({
            owner: repoOwner,
            repo: repoName,
            title: `trophy: shark vector harvest sequence #${sequenceIndex}`,
            head: branchName,
            base: 'main',
            body: `Automated PR verification payload #${sequenceIndex}/${quota} authored by @${targetUser.login} for Pull Shark achievement qualification.`,
          });

          this.log(options, 'INFO', `PR #${pr.number} đã khởi tạo [${sequenceIndex}/${quota}]. Tiến hành merge...`);
          await this.sleep(1500);

          // 4. Merge PR bằng phương thức 'merge' (Merge Commit với 2 cha)
          // Lý do: 'merge' bảo toàn commit history gốc của tác giả thay vì 'squash' gom gộp
          await mergerGithub.mergePullRequest({
            owner: repoOwner,
            repo: repoName,
            pullNumber: pr.number,
            commitTitle: `Merge pull request #${pr.number} from ${branchName} (Shark Sequence #${sequenceIndex})`,
            mergeMethod: 'merge',
          });

          itemsProcessed++;
          success = true;
          this.log(options, 'OK', `PR #${pr.number} merged thành công! Tiến trình: [${itemsProcessed}/${quota}] PRs`);

          // 5. Dọn dẹp nhánh
          await this.github.deleteBranch(repoOwner, repoName, branchName);

          // Giãn cách request tránh GitHub Secondary Rate Limit
          if (itemsProcessed < quota) {
            await this.sleep(delay);
          }
        } catch (err: any) {
          this.log(
            options,
            'WARN',
            `Lỗi tại chu kỳ PR #${sequenceIndex} (Lần thử ${attempt}/${maxRetries}): ${err.message}`
          );

          // Dọn dẹp nhánh rác nếu đã lỡ tạo
          try {
            await this.github.deleteBranch(repoOwner, repoName, branchName);
          } catch {
            // bỏ qua
          }

          if (attempt < maxRetries) {
            const backoff = 4000 * attempt;
            this.log(options, 'INFO', `Chờ ${backoff / 1000}s trước khi thử lại chu kỳ #${sequenceIndex}...`);
            await this.sleep(backoff);
          } else {
            this.log(
              options,
              'ERROR',
              `Đã vượt quá số lần thử lại cho PR #${sequenceIndex}. Tạm dừng chu kỳ để đảm bảo an toàn tài khoản.`
            );
            break;
          }
        }
      }

      if (!success) {
        // Dừng vòng lặp chính nếu PR hiện tại không thể hoàn thành sau maxRetries
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      vector: this.name,
      success: itemsProcessed >= quota,
      unlocked: itemsProcessed >= 2,
      itemsProcessed,
      targetQuota: quota,
      details: `Đã hoàn thành ${itemsProcessed}/${quota} Pull Requests được merge. Đủ điều kiện cập nhật Pull Shark!`,
      durationMs,
    };
  }
}
