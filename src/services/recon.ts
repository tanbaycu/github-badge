/**
 * Reconnaissance Scanner - Quét và phân tích huy hiệu GitHub Profile
 */

import { AchievementItem, ReconProfileReport } from '../types';
import { GitHubService } from './github';

export class ReconScanner {
  private github: GitHubService;

  constructor(github: GitHubService) {
    this.github = github;
  }

  /**
   * Quét hồ sơ của một username cụ thể hoặc tài khoản hiện tại
   */
  public async scanProfile(targetUsername?: string): Promise<ReconProfileReport> {
    const user = targetUsername
      ? await this.github.request(`/users/${targetUsername}`)
      : await this.github.getAuthenticatedUser();

    // Thu thập danh sách thành tựu bằng cách phân tích trang achievements công khai
    const achievements = await this.scrapePublicAchievements(user.login);

    return {
      username: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      bio: user.bio || '',
      publicRepos: user.public_repos,
      followers: user.followers,
      achievements,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Cào nhẹ HTML tab achievements công khai để trích xuất huy hiệu và cấp độ
   */
  private async scrapePublicAchievements(username: string): Promise<AchievementItem[]> {
    const defaultCatalog: AchievementItem[] = [
      {
        id: 'quickdraw',
        name: 'Quickdraw',
        tier: 'Default',
        status: 'HUNTABLE',
        description: 'Close an Issue or Pull Request within 5 minutes of opening.',
        icon: '🤠',
        badgeColor: '#f59e0b',
      },
      {
        id: 'yolo',
        name: 'YOLO',
        tier: 'Default',
        status: 'HUNTABLE',
        description: 'Merge a Pull Request without code review.',
        icon: '🚀',
        badgeColor: '#ec4899',
      },
      {
        id: 'pair-extraordinaire',
        name: 'Pair Extraordinaire',
        tier: 'Default',
        status: 'HUNTABLE',
        description: 'Co-author a commit in a merged Pull Request.',
        icon: '👯',
        badgeColor: '#8b5cf6',
      },
      {
        id: 'pull-shark',
        name: 'Pull Shark',
        tier: 'Default',
        status: 'HUNTABLE',
        description: 'Merge pull requests (Default: 2, Bronze: 16, Silver: 128, Gold: 1024).',
        targetQuota: 128,
        icon: '🦈',
        badgeColor: '#3b82f6',
      },
      {
        id: 'galaxy-brain',
        name: 'Galaxy Brain',
        tier: 'Bronze (x2)',
        status: 'HUNTABLE',
        description: 'Have accepted answers in GitHub Discussions (2, 8, 16, 32).',
        targetQuota: 32,
        icon: '🧠',
        badgeColor: '#eab308',
      },
      {
        id: 'public-sponsor',
        name: 'Public Sponsor',
        tier: 'Default',
        status: 'HUNTABLE',
        description: 'Sponsor an open-source maintainer on GitHub Sponsors.',
        icon: '💖',
        badgeColor: '#ec4899',
      },
      {
        id: 'starstruck',
        name: 'Starstruck',
        tier: 'Bronze (x16)',
        status: 'HUNTABLE',
        description: 'Own a repository with stars (Bronze: 16, Silver: 128, Gold: 512).',
        icon: '⭐',
        badgeColor: '#f59e0b',
      },
    ];

    try {
      const res = await fetch(`https://github.com/${username}?tab=achievements`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'text/html',
        },
      });

      if (!res.ok) {
        return defaultCatalog;
      }

      const html = await res.text();

      // Trích xuất thông tin từng huy hiệu từ các thẻ HTML cụ thể
      return defaultCatalog.map((item) => {
        // Tìm link hoặc thẻ chứa achievement này
        const cardRegex = new RegExp(`<a[^>]*href="[^"]*achievement=${item.id}[^"]*"[^>]*>[\\s\\S]*?<\\/a>`, 'i');
        const cardMatch = html.match(cardRegex);

        if (cardMatch) {
          const cardHtml = cardMatch[0];
          // Trích xuất asset tier (default, bronze, silver, gold)
          const assetMatch = cardHtml.match(new RegExp(`assets\\/${item.id}-(default|bronze|silver|gold)`, 'i'));
          // Trích xuất nhãn cấp độ (ví dụ x2, x3, x4)
          const labelMatch = cardHtml.match(/achievement-tier-label[^>]*>([^<]+)</i);

          let tier: any = 'Default';
          const assetTier = assetMatch ? assetMatch[1].toLowerCase() : 'default';
          const tierLabel = labelMatch ? labelMatch[1].trim() : '';

          if (assetTier === 'gold') {
            tier = tierLabel ? `Gold (${tierLabel})` : 'Gold';
          } else if (assetTier === 'silver') {
            tier = tierLabel ? `Silver (${tierLabel})` : 'Silver';
          } else if (assetTier === 'bronze') {
            tier = tierLabel ? `Bronze (${tierLabel})` : 'Bronze';
          } else {
            tier = tierLabel ? `Default (${tierLabel})` : 'Default';
          }

          return {
            ...item,
            status: 'ACQUIRED',
            tier,
          };
        }

        return item;
      });
    } catch {
      return defaultCatalog;
    }
  }
}
