import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { TrophyHunterEngine } from '../orchestrator/engine';
import { VectorLogEntry } from '../types';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Quản lý SSE clients để stream logs theo thời gian thực
const sseClients: Response[] = [];

function broadcastLog(entry: VectorLogEntry) {
  const data = JSON.stringify(entry);
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

let isHarvesting = false;
let currentEngine: TrophyHunterEngine | null = null;

// API: Lấy cấu hình hiện tại (ẩn token vì bảo mật)
app.get('/api/config', (req: Request, res: Response) => {
  const cfg = getConfig();
  const helperTokens = (cfg.helperGithubToken || '').split('|').map((t) => t.trim()).filter(Boolean);
  res.json({
    hasGithubToken: Boolean(cfg.githubToken),
    hasHelperToken: Boolean(cfg.helperGithubToken),
    helperTokensCount: helperTokens.length,
    targetRepo: cfg.targetRepo,
    sharkQuota: cfg.sharkQuota,
    galaxyQuota: cfg.galaxyQuota,
    pairQuota: cfg.pairQuota,
    requestDelayMs: cfg.requestDelayMs,
    port: cfg.port,
  });
});

// API: Lưu cấu hình vào file .env
app.post('/api/config', (req: Request, res: Response) => {
  try {
    const { githubToken, helperGithubToken, targetRepo, sharkQuota, galaxyQuota } = req.body;
    const envPath = path.resolve(process.cwd(), '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const updateOrAppend = (key: string, val: string) => {
      const reg = new RegExp(`^${key}=.*$`, 'm');
      if (reg.test(envContent)) {
        envContent = envContent.replace(reg, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    };

    if (githubToken !== undefined && githubToken !== '') updateOrAppend('GITHUB_TOKEN', githubToken);
    if (helperGithubToken !== undefined) updateOrAppend('HELPER_GITHUB_TOKEN', helperGithubToken);
    if (targetRepo) updateOrAppend('TARGET_REPO', targetRepo);
    if (sharkQuota) updateOrAppend('SHARK_QUOTA', sharkQuota.toString());
    if (galaxyQuota) updateOrAppend('GALAXY_QUOTA', galaxyQuota.toString());

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    res.json({ success: true, message: 'Đã lưu cấu hình .env thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Quét Recon Profile
app.get('/api/recon', async (req: Request, res: Response) => {
  try {
    const cfg = getConfig();
    if (!cfg.githubToken) {
      return res.status(400).json({ error: 'Chưa cấu hình GITHUB_TOKEN trong file .env' });
    }
    const engine = new TrophyHunterEngine();
    await engine.authenticate();
    const report = await engine.scan();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: SSE Live Log Stream
app.get('/api/harvest/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

// API: Khởi chạy Harvest
app.post('/api/harvest/start', async (req: Request, res: Response) => {
  if (isHarvesting) {
    return res.status(400).json({ error: 'Một chiến dịch harvest đang chạy. Vui lòng đợi hoặc dừng lại trước.' });
  }

  const { vectors, sharkQuota, galaxyQuota, pairQuota } = req.body;

  isHarvesting = true;
  res.json({ success: true, message: 'Chiến dịch harvest đã được kích hoạt!' });

  try {
    currentEngine = new TrophyHunterEngine();
    broadcastLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      level: 'INFO',
      vector: 'SYSTEM',
      message: 'Khởi động quy trình harvest từ Web Dashboard...',
    });

    await currentEngine.run({
      vectors,
      sharkQuota,
      galaxyQuota,
      pairQuota,
      onLog: (entry) => {
        broadcastLog(entry);
      },
    });

    broadcastLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      level: 'OK',
      vector: 'SYSTEM',
      message: '🎉 Tất cả các Vector đã hoàn thành chiến dịch thành công!',
    });
  } catch (err: any) {
    broadcastLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      level: 'ERROR',
      vector: 'SYSTEM',
      message: `Thất bại: ${err.message}`,
    });
  } finally {
    isHarvesting = false;
    currentEngine = null;
  }
});

// API: Dừng Harvest
app.post('/api/harvest/stop', (req: Request, res: Response) => {
  isHarvesting = false;
  broadcastLog({
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    level: 'WARN',
    vector: 'SYSTEM',
    message: 'Tín hiệu ngắt harvest nhận được từ người dùng.',
  });
  res.json({ success: true, message: 'Đã gửi tín hiệu dừng.' });
});

const PORT = parseInt(process.env.PORT || '3456', 10);
app.listen(PORT, () => {
  console.log(`\n🚀 GitTrophy Web Dashboard đang chạy tại: http://localhost:${PORT}`);
  console.log(`💡 Mở trình duyệt để xem bảng điều khiển đồ họa và quản lý huy hiệu.\n`);
});
