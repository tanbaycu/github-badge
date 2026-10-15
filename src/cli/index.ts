/**
 * GitTrophy Peak Minimalist Interactive CLI Application
 * Chuẩn mực thiết kế cao cấp: Zero-bulky banners, In-CLI Token & Clone Account Management,
 * Powered by @clack/prompts.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pc from 'picocolors';
import {
  intro,
  outro,
  select,
  text,
  spinner,
  note,
  log,
  isCancel,
  cancel,
  confirm,
} from '@clack/prompts';
import { TrophyHunterEngine } from '../orchestrator/engine';
import { CliUI } from './ui';
import { getConfig } from '../config';

dotenv.config();

/**
 * Cập nhật biến môi trường trực tiếp vào file .env
 */
function updateEnvVariable(key: string, value: string): void {
  const envPath = path.resolve(process.cwd(), '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
  process.env[key] = value;
}

/**
 * Quản lý Token & Nick Clone trực tiếp trên CLI
 */
async function manageAccountsPrompt(): Promise<void> {
  const currentTarget = process.env.GITHUB_TOKEN ? '••••••••' + process.env.GITHUB_TOKEN.slice(-4) : pc.red('(Chưa có)');
  const currentHelper = process.env.HELPER_GITHUB_TOKEN ? '••••••••' + process.env.HELPER_GITHUB_TOKEN.slice(-4) : pc.yellow('(Chưa có)');

  const subAction = await select({
    message: 'Tùy chọn quản lý tài khoản & Token:',
    options: [
      {
        value: 'change-target',
        label: `🔑 Đổi Token tài khoản chính [${currentTarget}]`,
        hint: 'Tài khoản sẽ nhận các huy hiệu GitHub',
      },
      {
        value: 'change-helper',
        label: `👥 Cài đặt / Thêm Nick Clone (Helper Token) [${currentHelper}]`,
        hint: 'Nick phụ dùng để tạo PR & hỏi đáp chống bot-filter',
      },
      {
        value: 'remove-helper',
        label: '🗑️ Xóa Nick Clone (Chuyển về chế độ Single Account)',
        hint: 'Chỉ dùng 1 tài khoản duy nhất',
      },
      {
        value: 'back',
        label: '↩️ Quay lại Menu chính',
      },
    ],
  });

  if (isCancel(subAction) || subAction === 'back') {
    return;
  }

  if (subAction === 'change-target') {
    const newToken = await text({
      message: 'Nhập GitHub Token tài khoản chính mới (bắt đầu bằng ghp_):',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      validate: (v) => {
        if (!v || !v.trim()) return 'Token không được để trống!';
      },
    });

    if (!isCancel(newToken)) {
      updateEnvVariable('GITHUB_TOKEN', newToken.trim());
      log.success('Đã lưu GITHUB_TOKEN mới vào file .env thành công!');
    }
  } else if (subAction === 'change-helper') {
    const newHelper = await text({
      message: 'Nhập Token Nick Clone phụ (Helper Token):',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      validate: (v) => {
        if (!v || !v.trim()) return 'Token không được để trống!';
      },
    });

    if (!isCancel(newHelper)) {
      updateEnvVariable('HELPER_GITHUB_TOKEN', newHelper.trim());
      log.success('Đã lưu HELPER_GITHUB_TOKEN (Nick clone) vào file .env! Kích hoạt chế độ Dual-Token.');
    }
  } else if (subAction === 'remove-helper') {
    const sure = await confirm({
      message: 'Bạn có chắc muốn xóa Nick Clone không?',
    });
    if (sure && !isCancel(sure)) {
      updateEnvVariable('HELPER_GITHUB_TOKEN', '');
      log.info('Đã xóa Helper Token khỏi cấu hình.');
    }
  }
}

async function runCli() {
  console.clear();
  intro(pc.bold(pc.cyan('◆ GitTrophy Console')) + pc.gray(' • Autonomous Achievement Engine'));

  let cfg = getConfig();

  // Nếu chưa có GITHUB_TOKEN, cho phép nhập trực tiếp ngay trên CLI
  if (!process.env.GITHUB_TOKEN) {
    const enteredToken = await text({
      message: 'Chưa tìm thấy Token GitHub. Vui lòng dán Personal Access Token của bạn:',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      validate: (value) => {
        if (!value || !value.trim()) return 'Token không được để trống!';
      },
    });

    if (isCancel(enteredToken)) {
      cancel('Đã hủy phiên làm việc.');
      process.exit(0);
    }

    updateEnvVariable('GITHUB_TOKEN', enteredToken.trim());
    log.success('Đã lưu GITHUB_TOKEN vào cấu hình!');

    // Hỏi xem có muốn thêm nick clone luôn không
    const wantHelper = await confirm({
      message: 'Bạn có muốn thêm Nick Clone (Helper Token) để bật chế độ Dual-Token chống lọc không?',
      initialValue: true,
    });

    if (wantHelper && !isCancel(wantHelper)) {
      const helperTok = await text({
        message: 'Dán Token của Nick Clone (phụ):',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      });
      if (!isCancel(helperTok) && helperTok.trim()) {
        updateEnvVariable('HELPER_GITHUB_TOKEN', helperTok.trim());
        log.success('Đã lưu Nick Clone vào cấu hình!');
      }
    }
  }

  // Khởi tạo Engine và Spinner xác thực
  const s = spinner();
  s.start('Đang xác thực thông tin tài khoản...');

  const engine = new TrophyHunterEngine();
  let user;

  try {
    user = await engine.authenticate(() => {});
    s.stop(`Xác thực thành công: ${pc.bold(pc.green(`@${user.login}`))}`);
  } catch (err: any) {
    s.stop(pc.red('Xác thực thất bại.'));
    log.error(err.message);
    outro(pc.red('Vui lòng kiểm tra lại quyền của GITHUB_TOKEN trong Menu Cài Đặt.'));
    await manageAccountsPrompt();
    return runCli();
  }

  // Session Context tinh gọn, không lộ dữ liệu thô
  const hasHelper = Boolean(process.env.HELPER_GITHUB_TOKEN);
  note(
    [
      `${pc.gray('Tài khoản')} : ${pc.bold(pc.white(`@${user.login}`))}`,
      `${pc.gray('Chế độ')}    : ${hasHelper ? pc.cyan('Dual-Token Cross-Repo (Có Nick Clone hỗ trợ)') : pc.yellow('Single Account')}`,
      `${pc.gray('Mục tiêu')}  : ${pc.bold(pc.yellow('🦈 Pull Shark ➔ 👑 Cấp Vàng (1,024 PRs)'))}`,
    ].join('\n'),
    'Thông Tin Phiên Làm Việc'
  );

  // Menu điều hướng tương tác
  const action = await select({
    message: 'Chọn hành động bạn muốn thực hiện:',
    options: [
      {
        value: 'shark-gold',
        label: '🦈 Săn Pull Shark lên VÀNG (1,024 PRs Gold Tier)',
        hint: 'Tự động tạo & merge PRs liên tục để mở khóa Cá Mập Vàng',
      },
      {
        value: 'shark-custom',
        label: '🎯 Cày Pull Shark tùy chỉnh (Custom Quota)',
        hint: 'Tự chỉ định số lượng PRs bạn muốn thêm (50, 100, 256...)',
      },
      {
        value: 'recon',
        label: '🔍 Quét Radar Thành Tích (Recon Live Audit)',
        hint: 'Kiểm tra trạng thái 6 huy hiệu GitHub thời gian thực',
      },
      {
        value: 'manage-env',
        label: '⚙️ Cấu hình Token & Quản lý Nick Clone',
        hint: 'Thêm/đổi nick clone, đổi token chính trực tiếp trên CLI',
      },
      {
        value: 'web',
        label: '🌐 Mở Web Dashboard',
        hint: 'Mở giao diện giám sát đồ họa tại http://localhost:3456',
      },
      {
        value: 'exit',
        label: '🚪 Thoát',
      },
    ],
  });

  if (isCancel(action) || action === 'exit') {
    cancel('Đã thoát phiên làm việc.');
    process.exit(0);
  }

  switch (action) {
    case 'manage-env': {
      await manageAccountsPrompt();
      return runCli();
    }

    case 'shark-gold': {
      log.info(pc.bold(pc.yellow('Bắt đầu chiến dịch Pull Shark Vàng [Mục tiêu: 1,024 PRs]...')));

      const targetQuota = 1024;
      let lastPrTime = Date.now();
      let rateHistory: number[] = [];

      await engine.run({
        vectors: ['shark'],
        sharkQuota: targetQuota,
        onLog: (entry) => {
          if (entry.level === 'OK' && entry.message.includes('đã merge thành công')) {
            const now = Date.now();
            const elapsed = (now - lastPrTime) / 1000;
            lastPrTime = now;

            if (elapsed > 0 && elapsed < 60) {
              rateHistory.push(elapsed);
              if (rateHistory.length > 8) rateHistory.shift();
            }

            const avgRate =
              rateHistory.length > 0
                ? rateHistory.reduce((a, b) => a + b, 0) / rateHistory.length
                : 2.5;

            const prMatch = entry.message.match(/#(\d+)/);
            const prNum = prMatch ? prMatch[1] : '';

            const countMatch = entry.message.match(/#(\d+)\/(\d+)/);
            const currentCount = countMatch ? parseInt(countMatch[1], 10) : 0;

            const progress = CliUI.formatProgress(currentCount, targetQuota);
            const remaining = Math.round((targetQuota - currentCount) * avgRate);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const eta = currentCount < targetQuota ? pc.gray(` • ETA ~${mins}m${secs < 10 ? '0' : ''}${secs}s`) : '';

            log.success(
              `${pc.bold(`PR #${prNum}`)} merged  ${progress}${eta}`
            );
          } else if (entry.level === 'ERROR') {
            log.warn(pc.yellow(entry.message));
          }
        },
      });

      outro(
        pc.bold(pc.yellow('👑 PULL SHARK CẤP VÀNG ĐÃ MỞ KHÓA!')) +
          pc.white(' Đã merge đủ 1,024 PRs. GitHub sẽ đồng bộ huy hiệu lên hồ sơ sớm.')
      );
      break;
    }

    case 'shark-custom': {
      const quotaInput = await text({
        message: 'Nhập số lượng PRs bạn muốn cày thêm:',
        placeholder: '100',
        validate: (val) => {
          if (!val || !val.trim()) return 'Vui lòng nhập một số hợp lệ!';
          const num = parseInt(val, 10);
          if (isNaN(num) || num <= 0) return 'Vui lòng nhập số nguyên dương lớn hơn 0!';
        },
      });

      if (isCancel(quotaInput)) {
        cancel('Đã hủy thao tác.');
        process.exit(0);
      }

      const customQuota = parseInt(typeof quotaInput === 'string' ? quotaInput : '100', 10);
      log.info(`Bắt đầu cày hạn ngạch: ${pc.bold(customQuota.toString())} PRs...`);

      let lastPrTime = Date.now();
      let rateHistory: number[] = [];

      await engine.run({
        vectors: ['shark'],
        sharkQuota: customQuota,
        onLog: (entry) => {
          if (entry.level === 'OK' && entry.message.includes('đã merge thành công')) {
            const now = Date.now();
            const elapsed = (now - lastPrTime) / 1000;
            lastPrTime = now;

            if (elapsed > 0 && elapsed < 60) {
              rateHistory.push(elapsed);
              if (rateHistory.length > 8) rateHistory.shift();
            }

            const avgRate =
              rateHistory.length > 0
                ? rateHistory.reduce((a, b) => a + b, 0) / rateHistory.length
                : 2.5;

            const prMatch = entry.message.match(/#(\d+)/);
            const prNum = prMatch ? prMatch[1] : '';

            const countMatch = entry.message.match(/#(\d+)\/(\d+)/);
            const currentCount = countMatch ? parseInt(countMatch[1], 10) : 0;

            const progress = CliUI.formatProgress(currentCount, customQuota);
            log.success(`${pc.bold(`PR #${prNum}`)} merged  ${progress}`);
          }
        },
      });

      outro(`Đã cày thêm thành công ${customQuota} PRs.`);
      break;
    }

    case 'recon': {
      const scanSpinner = spinner();
      scanSpinner.start(`Đang quét trực tiếp thành tích cho @${user.login}...`);

      const report = await engine.scan();
      scanSpinner.stop('Quét hoàn tất.');

      const lines = report.achievements.map((item) => {
        const namePadded = pc.bold(item.name.padEnd(22, ' '));
        const tierPadded = pc.dim(item.tier.padEnd(14, ' '));
        const statusStyled =
          item.status === 'ACQUIRED'
            ? pc.green('✔ ĐÃ ĐẠT')
            : pc.yellow('⏳ CHƯA ĐẠT');

        return `• ${namePadded} ${tierPadded} ${statusStyled}  ${pc.gray(item.description)}`;
      });

      note(lines.join('\n'), `Trạng Thái Huy Hiệu (@${user.login})`);
      outro('Báo cáo hoàn tất.');
      break;
    }

    case 'web': {
      log.step('Khởi chạy Web Dashboard tại http://localhost:3456 ...');
      require('../web/server');
      break;
    }
  }
}

runCli().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
