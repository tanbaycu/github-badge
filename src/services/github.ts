/**
 * GitHub API Service - Quản lý tương tác REST và GraphQL với GitHub API.
 * Thiết kế theo chuẩn Zero-Dep (dùng Fetch API native của Node.js) để tối ưu tốc độ và kích thước.
 */

export interface GitHubUser {
  login: string;
  id: number;
  name: string;
  avatar_url: string;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  has_discussions: boolean;
  html_url: string;
}

export interface DiscussionCategory {
  id: string;
  name: string;
  isAnswerable: boolean;
}

export class GitHubService {
  private token: string;
  private baseUrl = 'https://api.github.com';
  private graphqlUrl = 'https://api.github.com/graphql';

  constructor(token: string) {
    this.token = token.trim();
  }

  /**
   * Helper gửi HTTP Request đến REST API
   */
  public async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GitTrophy-Hunter-Agent/1.0',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {
        // bỏ qua nếu không đọc được body
      }
      throw new Error(`GitHub API Error [${res.status} ${res.statusText}] tại ${endpoint}: ${errBody}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  }

  /**
   * Helper gửi GraphQL Request
   */
  public async graphql<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const res = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GitTrophy-Hunter-Agent/1.0',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = (await res.json()) as any;
    if (data.errors && data.errors.length > 0) {
      throw new Error(`GraphQL Error: ${data.errors.map((e: any) => e.message).join('; ')}`);
    }

    return data.data as T;
  }

  /**
   * Lấy thông tin tài khoản xác thực
   */
  public async getAuthenticatedUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>('/user');
  }

  /**
   * Kiểm tra hoặc tạo Repository public dùng để harvest badges
   */
  public async ensureRepository(repoName: string): Promise<GitHubRepo> {
    const user = await this.getAuthenticatedUser();
    try {
      // Thử lấy repo hiện có
      const existing = await this.request<GitHubRepo>(`/repos/${user.login}/${repoName}`);
      
      // Đảm bảo bật tính năng discussions
      if (!existing.has_discussions) {
        await this.request(`/repos/${user.login}/${repoName}`, 'PATCH', {
          has_discussions: true,
        });
        existing.has_discussions = true;
      }
      return existing;
    } catch {
      // Nếu chưa có, tạo mới public repository có README và Discussions
      const created = await this.request<GitHubRepo>('/user/repos', 'POST', {
        name: repoName,
        description: 'Automated Trophy Harvest Vault for GitHub Achievements',
        private: false,
        auto_init: true,
        has_discussions: true,
      });

      // Đợi 2 giây cho GitHub khởi tạo Git tree ban đầu
      await this.sleep(2000);
      return created;
    }
  }

  /**
   * Lấy SHA của nhánh mặc định
   */
  public async getDefaultBranchSha(owner: string, repo: string, branch = 'main'): Promise<string> {
    try {
      const ref = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      return ref.object.sha;
    } catch {
      // Thử fallback sang master nếu nhánh không phải main
      const ref = await this.request(`/repos/${owner}/${repo}/git/ref/heads/master`);
      return ref.object.sha;
    }
  }

  /**
   * Tạo một nhánh mới từ một SHA
   */
  public async createBranch(owner: string, repo: string, branchName: string, fromSha: string): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/git/refs`, 'POST', {
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    });
  }

  /**
   * Xóa một nhánh
   */
  public async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    try {
      await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branchName}`, 'DELETE');
    } catch {
      // Bỏ qua lỗi nếu nhánh đã bị xóa hoặc không tìm thấy
    }
  }

  /**
   * Tạo hoặc cập nhật file trên nhánh cụ thể (hỗ trợ Co-authored-by commit)
   */
  public async createOrUpdateFile(params: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    content: string;
    branch: string;
    sha?: string;
  }): Promise<{ commitSha: string }> {
    const base64Content = Buffer.from(params.content).toString('base64');
    const res = await this.request(
      `/repos/${params.owner}/${params.repo}/contents/${params.path}`,
      'PUT',
      {
        message: params.message,
        content: base64Content,
        branch: params.branch,
        sha: params.sha,
      }
    );
    return { commitSha: res.commit.sha };
  }

  /**
   * Tạo Pull Request
   */
  public async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body?: string;
  }): Promise<{ number: number; html_url: string }> {
    const pr = await this.request(`/repos/${params.owner}/${params.repo}/pulls`, 'POST', {
      title: params.title,
      head: params.head,
      base: params.base,
      body: params.body || 'Automated payload for GitTrophy verification.',
    });
    return { number: pr.number, html_url: pr.html_url };
  }

  /**
   * Thêm cộng tác viên vào Repository
   */
  public async addCollaborator(owner: string, repo: string, username: string, permission: 'pull' | 'push' | 'admin' = 'push'): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/collaborators/${username}`, 'PUT', {
      permission,
    });
  }

  /**
   * Tự động chấp nhận lời mời cộng tác (repository invitations)
   */
  public async acceptRepoInvitations(repoFullName?: string): Promise<void> {
    const invs = await this.request<any[]>('/user/repository_invitations');
    if (Array.isArray(invs)) {
      for (const inv of invs) {
        if (!repoFullName || inv.repository?.full_name?.toLowerCase() === repoFullName.toLowerCase()) {
          await this.request(`/user/repository_invitations/${inv.id}`, 'PATCH');
        }
      }
    }
  }

  /**
   * Merge Pull Request (hỗ trợ YOLO & Pull Shark)
   */
  public async mergePullRequest(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    commitTitle?: string;
    mergeMethod?: 'merge' | 'squash' | 'rebase';
  }): Promise<{ merged: boolean; sha: string }> {
    const res = await this.request(
      `/repos/${params.owner}/${params.repo}/pulls/${params.pullNumber}/merge`,
      'PUT',
      {
        commit_title: params.commitTitle || `Auto-merge PR #${params.pullNumber} for trophy sync`,
        merge_method: params.mergeMethod || 'merge',
      }
    );
    return { merged: res.merged, sha: res.sha };
  }

  /**
   * Tạo Issue (Dành cho Quickdraw)
   */
  public async createIssue(owner: string, repo: string, title: string, body?: string): Promise<{ number: number }> {
    const issue = await this.request(`/repos/${owner}/${repo}/issues`, 'POST', {
      title,
      body: body || 'Issue trigger sequence for Quickdraw trophy test.',
    });
    return { number: issue.number };
  }

  /**
   * Đóng Issue (Dành cho Quickdraw - phải đóng trong vòng 5 phút)
   */
  public async closeIssue(owner: string, repo: string, issueNumber: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`, 'PATCH', {
      state: 'closed',
      state_reason: 'completed',
    });
  }

  /**
   * Lấy Node ID của Repository và danh sách Danh mục Thảo luận (Q&A)
   */
  public async getRepoDiscussionMeta(owner: string, repo: string): Promise<{
    repositoryId: string;
    qaCategoryId: string | null;
  }> {
    const query = `
      query GetRepoMeta($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          hasDiscussionsEnabled
          discussionCategories(first: 20) {
            nodes {
              id
              name
              isAnswerable
            }
          }
        }
      }
    `;

    const data = await this.graphql<{
      repository: {
        id: string;
        hasDiscussionsEnabled: boolean;
        discussionCategories: {
          nodes: DiscussionCategory[];
        };
      };
    }>(query, { owner, name: repo });

    const categories = data.repository.discussionCategories.nodes;
    // Tìm danh mục cho phép trả lời (Q&A hoặc isAnswerable = true)
    const qaCategory = categories.find((c) => c.isAnswerable || c.name.toLowerCase().includes('q&a') || c.name.toLowerCase().includes('hỏi'));

    return {
      repositoryId: data.repository.id,
      qaCategoryId: qaCategory ? qaCategory.id : (categories[0]?.id || null),
    };
  }

  /**
   * Tạo Thảo luận mới trong repo (GraphQL)
   */
  public async createDiscussion(params: {
    repositoryId: string;
    categoryId: string;
    title: string;
    body: string;
  }): Promise<{ id: string; number: number; url: string }> {
    const query = `
      mutation CreateDiscussion($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {repositoryId: $repoId, categoryId: $catId, title: $title, body: $body}) {
          discussion {
            id
            number
            url
          }
        }
      }
    `;
    const res = await this.graphql<{
      createDiscussion: {
        discussion: {
          id: string;
          number: number;
          url: string;
        };
      };
    }>(query, {
      repoId: params.repositoryId,
      catId: params.categoryId,
      title: params.title,
      body: params.body,
    });

    return res.createDiscussion.discussion;
  }

  /**
   * Trả lời bình luận trong Thảo luận (GraphQL)
   */
  public async addDiscussionComment(params: {
    discussionId: string;
    body: string;
  }): Promise<{ id: string; url: string }> {
    const query = `
      mutation AddDiscussionComment($discussionId: ID!, $body: String!) {
        addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
          comment {
            id
            url
          }
        }
      }
    `;
    const res = await this.graphql<{
      addDiscussionComment: {
        comment: {
          id: string;
          url: string;
        };
      };
    }>(query, {
      discussionId: params.discussionId,
      body: params.body,
    });

    return res.addDiscussionComment.comment;
  }

  /**
   * Đánh dấu bình luận là câu trả lời chính xác (Accepted Answer - GraphQL)
   */
  public async markDiscussionCommentAsAnswer(commentId: string): Promise<{ discussionId: string }> {
    const query = `
      mutation MarkAnswer($commentId: ID!) {
        markDiscussionCommentAsAnswer(input: {id: $commentId}) {
          discussion {
            id
          }
        }
      }
    `;
    const res = await this.graphql<{
      markDiscussionCommentAsAnswer: {
        discussion: {
          id: string;
        };
      };
    }>(query, { commentId });

    return { discussionId: res.markDiscussionCommentAsAnswer.discussion.id };
  }

  /**
   * Sleep helper
   */
  public sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
