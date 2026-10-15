/**
 * Minimalist Peak Typography & Visual Helpers for GitTrophy Console
 * Thiết kế tinh tế, không banner thừa thãi, tối ưu tuyệt đối cho CLI Developer Tooling.
 */

import pc from 'picocolors';

export class CliUI {
  /**
   * Thanh tiến trình thời gian thực (Progress Bar) mượt mà
   */
  public static formatProgress(current: number, total: number, barWidth = 24): string {
    const cur = Math.min(current, total);
    const percent = total > 0 ? (cur / total) * 100 : 0;
    const filled = Math.round((percent / 100) * barWidth);
    const empty = Math.max(0, barWidth - filled);

    const bar = pc.green('█'.repeat(filled)) + pc.gray('░'.repeat(empty));
    const percentStr = `${percent.toFixed(1)}%`.padStart(6, ' ');
    const countStr = `${cur}/${total}`;

    return `${bar} ${pc.bold(pc.white(percentStr))} [${pc.cyan(countStr)}]`;
  }
}
