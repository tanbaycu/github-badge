import pc from 'picocolors';
import { TrophyHunterEngine } from './orchestrator/engine';

async function main() {
  const args = process.argv.slice(2);

  const isAll = args.includes('--all');
  const isReconOnly = args.includes('--recon');
  const vectorArgIdx = args.indexOf('--vector');
  const selectedVector = vectorArgIdx !== -1 ? args[vectorArgIdx + 1] : undefined;

  let sharkQuotaOverride: number | undefined;
  const sharkQuotaIdx = args.indexOf('--shark-quota');
  if (sharkQuotaIdx !== -1 && args[sharkQuotaIdx + 1]) {
    sharkQuotaOverride = parseInt(args[sharkQuotaIdx + 1], 10);
  }

  let galaxyQuotaOverride: number | undefined;
  const galaxyQuotaIdx = args.indexOf('--galaxy-quota');
  if (galaxyQuotaIdx !== -1 && args[galaxyQuotaIdx + 1]) {
    galaxyQuotaOverride = parseInt(args[galaxyQuotaIdx + 1], 10);
  }

  const engine = new TrophyHunterEngine();

  try {
    if (isReconOnly) {
      await engine.run({ reconOnly: true });
      process.exit(0);
    }

    let vectors: any[] | undefined = undefined;
    if (selectedVector) {
      vectors = [selectedVector];
    } else if (isAll) {
      vectors = ['quickdraw', 'yolo', 'pair', 'shark', 'galaxy'];
    }

    const summaries = await engine.run({
      vectors,
      sharkQuota: sharkQuotaOverride,
      galaxyQuota: galaxyQuotaOverride,
    });

    console.log('\n' + pc.green('═══════════════════════════════════════════════════════════'));
    console.log(pc.bold(pc.green('   CHIẾN DỊCH HARVEST HOÀN TẤT THÀNH CÔNG!')));
    console.log(pc.green('═══════════════════════════════════════════════════════════'));
    for (const s of summaries) {
      console.log(
        `${pc.cyan(`[${s.vector}]`)}: Đã xử lý ${pc.bold(s.itemsProcessed.toString())}/${s.targetQuota} mục - ${s.details}`
      );
    }
    console.log(
      pc.dim('\nLưu ý: GitHub cần từ vài phút đến tối đa 24h để đồng bộ huy hiệu lên hồ sơ công khai của bạn.')
    );
  } catch (err: any) {
    console.error('\n' + pc.red(`[FATAL ERROR] ${err.message}`));
    console.error(pc.yellow('\n💡 Gợi ý giải pháp:'));
    console.error(pc.white('1. Kiểm tra file .env xem đã điền GITHUB_TOKEN chưa.'));
    console.error(pc.white('2. Token cần có quyền: repo, write:discussion, workflow.'));
    console.error(pc.white('3. Đối với Galaxy Brain, hãy điền thêm HELPER_GITHUB_TOKEN để tự động 100%.'));
    process.exit(1);
  }
}

main();
