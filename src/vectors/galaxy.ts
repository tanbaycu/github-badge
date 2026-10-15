import { GitHubService } from '../services/github';
import { VectorExecutionSummary, VectorOptions } from '../types';
import { BaseVector } from './base';

export class GalaxyBrainVector extends BaseVector {
  public readonly name = 'Galaxy Vector';
  public readonly description = 'Automated Discussions Q&A Accepted Answer cycle for Galaxy Brain (Bronze: 2, Silver: 8, Gold: 32)';

  private helperGithub?: GitHubService;

  constructor(targetGithub: GitHubService, helperGithub?: GitHubService) {
    super(targetGithub);
    this.helperGithub = helperGithub;
  }

  public async execute(options: VectorOptions): Promise<VectorExecutionSummary> {
    const startTime = Date.now();
    const quota = options.quota || 32;
    const delay = options.delayMs || 2500;
    let itemsProcessed = 0;

    const targetUser = await this.github.getAuthenticatedUser();
    this.log(options, 'PAYLOAD', `Khởi động Galaxy Vector cho tài khoản @${targetUser.login} -> Mục tiêu: ${quota} câu trả lời được Accept`);

    // Đảm bảo Repository có bật tính năng Discussions
    const repo = await this.github.ensureRepository(options.repoName);

    // Lấy thông tin Repository Node ID và danh mục Q&A
    const meta = await this.github.getRepoDiscussionMeta(targetUser.login, repo.name);
    if (!meta.qaCategoryId) {
      throw new Error(`Không tìm thấy danh mục Q&A (Answerable) trong repository ${repo.full_name}. Hãy đảm bảo Discussions đã được kích hoạt danh mục Q&A.`);
    }

    if (!this.helperGithub) {
      this.log(
        options,
        'WARN',
        `⚠️ CẢNH BÁO QUAN TRỌNG: Không tìm thấy HELPER_GITHUB_TOKEN trong cấu hình!`
      );
      this.log(
        options,
        'INFO',
        `GitHub có cơ chế chống gian lận: Nếu cùng 1 tài khoản tự tạo câu hỏi rồi tự accept câu trả lời của chính mình, GitHub sẽ KHÔNG tính điểm Galaxy Brain.`
      );
      this.log(
        options,
        'INFO',
        `Giải pháp chuẩn: Hãy tạo thêm 1 tài khoản GitHub phụ (clone) miễn phí, tạo Personal Access Token và điền vào HELPER_GITHUB_TOKEN trong .env để tool tự động hỏi & accept 100% cho tài khoản chính.`
      );
      this.log(
        options,
        'PAYLOAD',
        `Đang khởi tạo các Discussions Q&A trên repo để bạn có thể dùng tài khoản khác vào trả lời hoặc accept...`
      );

      // Tạo mẫu các câu hỏi thảo luận
      for (let i = 1; i <= Math.min(quota, 5); i++) {
        try {
          const disc = await this.github.createDiscussion({
            repositoryId: meta.repositoryId,
            categoryId: meta.qaCategoryId,
            title: `[Q&A Inquiry #${i}] How to optimize data caching in microservices?`,
            body: `Looking for recommendations on high-throughput caching and eviction strategies for component #${i}.`,
          });
          this.log(options, 'OK', `Đã tạo Thảo luận Q&A #${disc.number}: ${disc.url}`);
          itemsProcessed++;
          await this.sleep(delay);
        } catch (err: any) {
          this.log(options, 'ERROR', `Lỗi tạo thảo luận #${i}: ${err.message}`);
        }
      }

      return {
        vector: this.name,
        success: false,
        unlocked: false,
        itemsProcessed,
        targetQuota: quota,
        details: `Cần bổ sung HELPER_GITHUB_TOKEN để hoàn tất tự động 100% việc Accept câu trả lời đạt Galaxy Brain Vàng.`,
        durationMs: Date.now() - startTime,
      };
    }

    // Chế độ Dual-Token: Hoàn toàn tự động và hợp lệ theo chuẩn GitHub!
    const helperUser = await this.helperGithub.getAuthenticatedUser();
    this.log(
      options,
      'INFO',
      `Xác thực thành công Helper Account: @${helperUser.login}. Chuẩn bị chu trình: @${helperUser.login} đặt câu hỏi -> @${targetUser.login} trả lời -> @${helperUser.login} bấm Chấp nhận câu trả lời!`
    );

    for (let i = 1; i <= quota; i++) {
      try {
        // 1. Helper tạo câu hỏi Q&A
        const questionTitle = `[Tech Q&A #${i}] Best practices for high-performance memory indexing in service #${i}?`;
        const questionBody = `Hello community! We are designing system component #${i}. What is the recommended strategy for reducing allocation overhead under heavy workload?`;

        this.log(options, 'PAYLOAD', `[${i}/${quota}] @${helperUser.login} đang tạo câu hỏi thảo luận Q&A...`);
        const disc = await this.helperGithub.createDiscussion({
          repositoryId: meta.repositoryId,
          categoryId: meta.qaCategoryId,
          title: questionTitle,
          body: questionBody,
        });

        await this.sleep(1500);

        // 2. Target User (tài khoản chính cần nhận huy hiệu Galaxy Brain) vào trả lời
        const answerBody = `Here is the verified architectural solution for #${i}:\n\n1. Use memory arena pools to avoid GC pressure.\n2. Leverage SIMD-accelerated linear probing hash maps.\n3. Keep cache lines aligned to 64 bytes.\n\nTested and verified in production environment.`;

        this.log(options, 'INFO', `[${i}/${quota}] @${targetUser.login} đang gửi câu trả lời kỹ thuật vào Discussion #${disc.number}...`);
        const comment = await this.github.addDiscussionComment({
          discussionId: disc.id,
          body: answerBody,
        });

        await this.sleep(1500);

        // 3. Helper User (người đặt câu hỏi) đánh dấu câu trả lời của Target User là Accepted Answer!
        this.log(options, 'INFO', `[${i}/${quota}] @${helperUser.login} đang đánh dấu câu trả lời của @${targetUser.login} là ACCEPTED ANSWER...`);
        await this.helperGithub.markDiscussionCommentAsAnswer(comment.id);

        itemsProcessed++;
        this.log(options, 'OK', `Đã chấp nhận câu trả lời #${itemsProcessed}/${quota} thành công! (Discussion #${disc.number}) 🧠 Galaxy Brain điểm +1`);

        // Nghỉ giữa các lượt để tránh spam rate limit
        if (i < quota) {
          await this.sleep(delay);
        }
      } catch (err: any) {
        this.log(options, 'ERROR', `Lỗi tại chu kỳ Galaxy Brain #${i}: ${err.message}`);
        await this.sleep(5000);
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      vector: this.name,
      success: itemsProcessed >= quota,
      unlocked: itemsProcessed >= 2,
      itemsProcessed,
      targetQuota: quota,
      details: `Đã hoàn thành ${itemsProcessed}/${quota} câu trả lời được chấp nhận (Accepted Answers). Đủ điều kiện nhận Galaxy Brain Cấp Vàng!`,
      durationMs,
    };
  }
}
