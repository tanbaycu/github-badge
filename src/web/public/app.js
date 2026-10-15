/**
 * GitTrophy Sentinel — Design Engineering Client Application (v2.4-PRO)
 * Features: Mission Command HUD Header, Flat Official Badges (Unlocked vs Locked),
 * Typeform Setup Wizard, Standalone Live SSE Terminal Deck, Desktop Inline Workbench,
 * Mobile iOS Bottom Sheet, Sonner Toast Kit, and FlowNumber Animation.
 * Author: tanbaycu (@tanbaycu)
 */

// ==========================================================================
// ==========================================================================
// 1. SONNER TOAST KIT (Emil Kowalski True 3D Stacked Architecture)
// ==========================================================================

const toast = {
  container: null,
  activeToasts: [],

  init() {
    this.container = document.getElementById('sonner-toaster');
  },

  create(type, title, desc = '', duration = 4000) {
    if (!this.container) this.init();
    if (!this.container) return;

    playClickSound();

    const toastEl = document.createElement('div');
    toastEl.className = `sonner-toast ${type}`;

    let iconClass = 'ph-duotone ph-info';
    if (type === 'success') iconClass = 'ph-duotone ph-check-circle';
    if (type === 'error') iconClass = 'ph-duotone ph-warning-circle';

    toastEl.innerHTML = `
      <i class="${iconClass} sonner-icon"></i>
      <div class="sonner-content">
        <div class="sonner-title">${title}</div>
        ${desc ? `<div class="sonner-desc">${desc}</div>` : ''}
      </div>
      <button class="sonner-close" aria-label="Đóng thông báo">✕</button>
    `;

    const closeBtn = toastEl.querySelector('.sonner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(toastEl);
      });
    }

    this.container.prepend(toastEl);
    this.activeToasts.unshift(toastEl);
    this.updateStack();

    setTimeout(() => {
      this.dismiss(toastEl);
    }, duration);
  },

  dismiss(toastEl) {
    if (!toastEl || toastEl.classList.contains('dismissing')) return;
    toastEl.classList.add('dismissing');
    this.activeToasts = this.activeToasts.filter(t => t !== toastEl);
    this.updateStack();
    setTimeout(() => {
      if (toastEl.parentElement) toastEl.remove();
    }, 250);
  },

  updateStack() {
    this.activeToasts.forEach((el, index) => {
      el.setAttribute('data-index', index);
      el.style.setProperty('--index', index);
    });
  },

  success(title, desc) { this.create('success', title, desc); },
  error(title, desc) { this.create('error', title, desc); },
  info(title, desc) { this.create('info', title, desc); },
};

// ==========================================================================
// 2. FLOWNUMBER ANIMATION KIT (Tabular Rolling Digits)
// ==========================================================================

const FlowNumber = {
  currentValues: {},

  animate(elementId, targetValue, duration = 600, isFloat = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startVal = this.currentValues[elementId] !== undefined 
      ? this.currentValues[elementId] 
      : parseFloat(el.textContent.replace(/,/g, '')) || 0;

    this.currentValues[elementId] = targetValue;

    if (startVal === targetValue) {
      el.textContent = isFloat ? targetValue.toFixed(1) : targetValue.toLocaleString();
      return;
    }

    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 200);

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetValue - startVal) * ease;

      el.textContent = isFloat 
        ? current.toFixed(1) 
        : Math.round(current).toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = isFloat ? targetValue.toFixed(1) : targetValue.toLocaleString();
      }
    };

    requestAnimationFrame(step);
  },
};

// ==========================================================================
// 3. WEB AUDIO SYNTHESIZER (Haptic Click Feedback)
// ==========================================================================

let audioCtx = null;

function playClickSound() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    // Ignore restricted audio
  }
}

// ==========================================================================
// 4. GLOBAL SKELETON FADE-OUT
// ==========================================================================

function hideGlobalSkeleton() {
  const sk = document.getElementById('global-skeleton');
  if (sk) {
    sk.classList.add('hidden');
    setTimeout(() => {
      sk.style.display = 'none';
    }, 450);
  }
  document.body.classList.remove('loading-state');
}

// ==========================================================================
// 5. 3D ISOMETRIC CURSOR TRACKING (Chamber Fig. 1)
// ==========================================================================

function setupIsometricCursorTracker() {
  const canvasWrap = document.querySelector('.blueprint-canvas');
  const isoScene = document.getElementById('iso-scene');
  if (!canvasWrap || !isoScene) return;

  canvasWrap.addEventListener('mousemove', (e) => {
    const rect = canvasWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    const tiltX = -normY * 8;
    const tiltY = normX * 12;

    isoScene.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
  });

  canvasWrap.addEventListener('mouseleave', () => {
    isoScene.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  });
}

// ==========================================================================
// 6. CLOCK & STATUS TIMER
// ==========================================================================

function updateClock() {
  const timeElem = document.getElementById('info-local-time');
  if (!timeElem) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  timeElem.textContent = `${timeStr} (active)`;
}

// ==========================================================================
// 7. DATA FETCHING (CONFIG & RECON AUDIT)
// ==========================================================================

let currentPrCount = 128;
const targetGoldGoal = 1024;
let globalConfig = null;

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    globalConfig = data;

    const cloneStatus = document.getElementById('info-clone-status');
    const tokenStatus = document.getElementById('info-token-status');
    const repoStatus = document.getElementById('info-repo');
    const hdrTargetRepo = document.getElementById('hdr-target-repo');

    if (cloneStatus) {
      if (data.helperTokensCount > 1) {
        cloneStatus.textContent = `Multi-Token Active (${data.helperTokensCount} Clones)`;
      } else if (data.hasHelperToken) {
        cloneStatus.textContent = 'Dual-Token Active (Bypass Filters)';
      } else {
        cloneStatus.textContent = 'Single Account';
      }
    }
    if (tokenStatus) {
      tokenStatus.textContent = data.hasGithubToken ? 'ghp_•••••••• (Valid)' : 'Chưa cấu hình';
    }
    if (repoStatus && data.targetRepo) {
      repoStatus.textContent = data.targetRepo;
    }
    if (hdrTargetRepo && data.targetRepo) {
      hdrTargetRepo.textContent = `tanbaycu / ${data.targetRepo}`;
    }

    const cfgRepoInput = document.getElementById('cfg-repo-name');
    if (cfgRepoInput && data.targetRepo) {
      cfgRepoInput.value = data.targetRepo;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

async function loadRecon() {
  try {
    const res = await fetch('/api/recon');
    if (!res.ok) {
      hideGlobalSkeleton();
      return;
    }
    const data = await res.json();

    if (data.username) {
      const nameElem = document.getElementById('profile-name');
      const targetLoginElem = document.getElementById('info-target-login');
      const avatarElem = document.getElementById('profile-avatar');
      const hdrAvatar = document.getElementById('hdr-avatar');

      if (nameElem) nameElem.textContent = `${data.name || data.username}`;
      if (targetLoginElem) targetLoginElem.textContent = `@${data.username}`;
      if (avatarElem && data.avatarUrl) avatarElem.src = data.avatarUrl;
      if (hdrAvatar && data.avatarUrl) hdrAvatar.src = data.avatarUrl;
    }

    // Pull Shark Achievements FlowNumber Metrics
    if (Array.isArray(data.achievements)) {
      const shark = data.achievements.find((a) => a.id === 'pull-shark');
      if (shark) {
        currentPrCount = shark.currentPrCount || 128;
        const remaining = Math.max(0, targetGoldGoal - currentPrCount);

        FlowNumber.animate('fn-current-prs', currentPrCount);
        FlowNumber.animate('fn-target-prs', targetGoldGoal);
        FlowNumber.animate('fn-remaining-prs', remaining);
        FlowNumber.animate('fn-meter-cur', currentPrCount);

        const pct = ((currentPrCount / targetGoldGoal) * 100);
        FlowNumber.animate('fn-progress-pct', pct, 600, true);

        const fillBar = document.getElementById('meter-fill-bar');
        if (fillBar) fillBar.style.width = `${Math.min(100, pct)}%`;

        // Update Header Capsule HUD
        const hdrCurPrs = document.getElementById('hdr-cur-prs');
        const hdrPct = document.getElementById('hdr-progress-pct');
        const hdrBar = document.getElementById('hdr-progress-bar');
        const hdrRem = document.getElementById('hdr-remaining-prs');

        if (hdrCurPrs) hdrCurPrs.textContent = currentPrCount.toString();
        if (hdrPct) hdrPct.textContent = `${pct.toFixed(1)}%`;
        if (hdrBar) hdrBar.style.width = `${Math.min(100, pct)}%`;
        if (hdrRem) hdrRem.textContent = `${remaining} PRs`;

        const inputQuota = document.getElementById('input-quota');
        if (inputQuota && remaining > 0) inputQuota.value = remaining.toString();

        const wbStatus = document.getElementById('wb-spec-status');
        if (wbStatus) {
          wbStatus.textContent = `${currentPrCount} / ${targetGoldGoal} PRs (${pct.toFixed(1)}%)`;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load recon data:', err);
  } finally {
    hideGlobalSkeleton();
  }
}

// ==========================================================================
// 8. STEPPER & PRESET LOGIC
// ==========================================================================

function adjustQuota(delta) {
  playClickSound();
  const input = document.getElementById('input-quota');
  if (!input) return;
  let val = parseInt(input.value, 10) || 0;
  val = Math.max(1, Math.min(1024, val + delta));
  input.value = val.toString();
}

function setQuotaPreset(presetValue) {
  playClickSound();
  const input = document.getElementById('input-quota');
  if (!input) return;
  input.value = presetValue.toString();

  document.querySelectorAll('.p-btn').forEach((btn) => btn.classList.remove('active'));
  event?.target?.classList?.add('active');

  toast.info('Hạn ngạch đã chọn', `Đã đặt quota săn: ${presetValue} PRs`);
}

// ==========================================================================
// 9. STANDALONE LIVE TERMINAL COMPONENT (live-engine-sse.log)
// ==========================================================================

let isHarvestRunning = false;
let lastPrTime = Date.now();
const speedHistory = [];
let autoScroll = true;
let totalLogLines = 1;
let currentLogFilter = 'all';

function setupLiveStream() {
  const evtSource = new EventSource('/api/harvest/stream');

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      appendLog(data.timestamp, data.level, data.message);

      // Track PR merge events
      if (data.level === 'OK' && data.message.includes('đã merge thành công')) {
        const now = Date.now();
        const durationSec = (now - lastPrTime) / 1000;
        lastPrTime = now;

        if (durationSec > 0 && durationSec < 60) {
          speedHistory.push(durationSec);
          if (speedHistory.length > 6) speedHistory.shift();
          const avgVelocity = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
          FlowNumber.animate('fn-velocity', avgVelocity, 400, true);
          
          const rateStat = document.getElementById('term-rate-stat');
          if (rateStat) rateStat.textContent = `${(1 / avgVelocity).toFixed(2)} PR/s`;
        }

        currentPrCount++;
        const remaining = Math.max(0, targetGoldGoal - currentPrCount);
        FlowNumber.animate('fn-current-prs', currentPrCount);
        FlowNumber.animate('fn-remaining-prs', remaining);
        FlowNumber.animate('fn-meter-cur', currentPrCount);

        const pct = ((currentPrCount / targetGoldGoal) * 100);
        FlowNumber.animate('fn-progress-pct', pct, 400, true);

        const fillBar = document.getElementById('meter-fill-bar');
        if (fillBar) fillBar.style.width = `${Math.min(100, pct)}%`;

        // Update Header HUD
        const hdrCurPrs = document.getElementById('hdr-cur-prs');
        const hdrPct = document.getElementById('hdr-progress-pct');
        const hdrBar = document.getElementById('hdr-progress-bar');
        const hdrRem = document.getElementById('hdr-remaining-prs');

        if (hdrCurPrs) hdrCurPrs.textContent = currentPrCount.toString();
        if (hdrPct) hdrPct.textContent = `${pct.toFixed(1)}%`;
        if (hdrBar) hdrBar.style.width = `${Math.min(100, pct)}%`;
        if (hdrRem) hdrRem.textContent = `${remaining} PRs`;

        const prMatch = data.message.match(/#(\d+)/);
        const prNum = prMatch ? `#${prMatch[1]}` : 'PR';

        toast.success(`Merge Thành Công ${prNum}`, `Tiến độ: ${currentPrCount} / ${targetGoldGoal} PRs`);
      }

      if (data.level === 'OK' && data.message.includes('Tất cả các Vector đã hoàn thành')) {
        setHarvestState(false);
        toast.success('Chiến Dịch Hoàn Thành!', 'Tất cả các PRs đã được merge thành công vào kho lưu trữ.');
      }
    } catch (e) {
      // ignore
    }
  };

  evtSource.onerror = () => {
    // EventSource will auto reconnect
  };
}

function appendLog(timestamp, level, message) {
  const container = document.getElementById('term-logs');
  if (!container) return;

  totalLogLines++;
  const linesCount = document.getElementById('term-lines-count');
  if (linesCount) linesCount.textContent = `${totalLogLines} LINES`;

  const line = document.createElement('div');
  const lvlLower = (level || 'info').toLowerCase();
  line.className = `console-line ${lvlLower}`;
  line.setAttribute('data-level', lvlLower);

  if (currentLogFilter !== 'all') {
    if (currentLogFilter === 'ok' && lvlLower !== 'ok') line.classList.add('hidden-by-filter');
    if (currentLogFilter === 'info' && lvlLower !== 'info') line.classList.add('hidden-by-filter');
    if (currentLogFilter === 'error' && lvlLower !== 'error' && lvlLower !== 'warn') line.classList.add('hidden-by-filter');
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'console-time mono';
  timeSpan.textContent = `[${timestamp || new Date().toLocaleTimeString('vi-VN', { hour12: false })}]`;

  const tagSpan = document.createElement('span');
  tagSpan.className = `console-tag mono ${lvlLower}`;
  const tagMap = { ok: '[MERGE]', info: '[INFO]', error: '[ERROR]', warn: '[WARN]', sys: '[SYSTEM]' };
  tagSpan.textContent = tagMap[lvlLower] || `[${(level || 'LOG').toUpperCase()}]`;

  const msgSpan = document.createElement('span');
  msgSpan.className = 'console-msg mono';
  msgSpan.textContent = message;

  line.appendChild(timeSpan);
  line.appendChild(tagSpan);
  line.appendChild(msgSpan);
  container.appendChild(line);

  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function filterLogs(level) {
  playClickSound();
  currentLogFilter = level;

  document.querySelectorAll('.tab-filter').forEach((tab) => {
    if (tab.getAttribute('data-filter') === level) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const lines = document.querySelectorAll('#term-logs .console-line');
  lines.forEach((line) => {
    const l = line.getAttribute('data-level');
    if (level === 'all') {
      line.classList.remove('hidden-by-filter');
    } else if (level === 'ok') {
      if (l === 'ok') line.classList.remove('hidden-by-filter');
      else line.classList.add('hidden-by-filter');
    } else if (level === 'info') {
      if (l === 'info') line.classList.remove('hidden-by-filter');
      else line.classList.add('hidden-by-filter');
    } else if (level === 'error') {
      if (l === 'error' || l === 'warn') line.classList.remove('hidden-by-filter');
      else line.classList.add('hidden-by-filter');
    }
  });
}

function toggleAutoScroll() {
  playClickSound();
  autoScroll = !autoScroll;
  const btn = document.getElementById('autoscroll-btn');
  if (btn) {
    if (autoScroll) {
      btn.classList.add('active');
      toast.info('Auto-Scroll Bật', 'Console sẽ tự động cuộn theo log mới.');
      const container = document.getElementById('term-logs');
      if (container) container.scrollTop = container.scrollHeight;
    } else {
      btn.classList.remove('active');
      toast.info('Auto-Scroll Tắt', 'Đã cố định vị trí xem log.');
    }
  }
}

function clearLogs() {
  playClickSound();
  const container = document.getElementById('term-logs');
  if (container) {
    container.innerHTML = `
      <div class="console-line info" data-level="info">
        <span class="console-time mono">[SYSTEM]</span>
        <span class="console-msg mono">Terminal stream cleared. Ready for operations.</span>
      </div>
    `;
    totalLogLines = 1;
    const linesCount = document.getElementById('term-lines-count');
    if (linesCount) linesCount.textContent = `1 LINES`;
    toast.info('Terminal Cleared', 'Bản ghi log màn hình đã được xóa.');
  }
}

function copyLogs() {
  playClickSound();
  const container = document.getElementById('term-logs');
  if (!container) return;
  const text = container.innerText;
  navigator.clipboard.writeText(text).then(() => {
    toast.info('Copied to Clipboard', 'Toàn bộ nội dung Terminal đã được copy.');
  });
}

function downloadLogs() {
  playClickSound();
  const container = document.getElementById('term-logs');
  if (!container) return;
  const text = container.innerText;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `live-engine-sse-${new Date().toISOString().slice(0, 10)}.log.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Đã Tải File Log', 'File .txt đã được lưu về máy tính của bạn.');
}

// ==========================================================================
// 10. HARVEST START & STOP ACTIONS
// ==========================================================================

async function triggerHarvest() {
  playClickSound();
  const inputQuota = document.getElementById('input-quota');
  const quota = parseInt(inputQuota ? inputQuota.value : '896', 10) || 896;

  setHarvestState(true);
  toast.info('Kích Hoạt Engine', `Bắt đầu chiến dịch Pull Shark với hạn ngạch: ${quota} PRs.`);

  try {
    const res = await fetch('/api/harvest/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: ['shark'],
        sharkQuota: quota,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error('Lỗi Khởi Động', result.error || 'Không thể bắt đầu harvest.');
      setHarvestState(false);
    }
  } catch (err) {
    toast.error('Lỗi Mạng', err.message);
    setHarvestState(false);
  }
}

async function stopHarvest() {
  playClickSound();
  try {
    await fetch('/api/harvest/stop', { method: 'POST' });
    toast.info('Đã Gửi Lệnh Dừng', 'Engine sẽ dừng an toàn sau khi commit hiện tại hoàn tất.');
    setHarvestState(false);
  } catch (err) {
    console.error('Stop error:', err);
  }
}

function setHarvestState(running) {
  isHarvestRunning = running;
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const statusPill = document.getElementById('term-status-pill');

  if (startBtn) startBtn.style.display = running ? 'none' : 'inline-flex';
  if (stopBtn) stopBtn.style.display = running ? 'inline-flex' : 'none';
  if (statusPill) {
    statusPill.textContent = running ? 'HARVEST RUNNING • AUTO-MERGING' : 'SSE LISTENING • ACTIVE';
  }
}

// ==========================================================================
// 11. BADGE INSPECTION (DESKTOP WORKBENCH VS MOBILE iOS BOTTOM SHEET)
// Accurate specifications for UNLOCKED vs LOCKED trophies.
// ==========================================================================

const BADGE_DETAILS = {
  shark: {
    img: '/badges/pull-shark-gold.png',
    tier: 'ĐANG SĂN GOLD x4',
    title: 'Pull Shark (Cá Mập Kéo)',
    desc: 'Huy hiệu danh giá dành cho tác giả đạt mốc 1,024 Pull Requests đã được merge thành công. Tài khoản hiện đạt cấp Silver x3 và đang tiến hành tự động cày lên Gold x4.',
    status: 'Đang Sở Hữu: Silver x3 (128 / 1,024 PRs)',
    vector: 'REST API Pull Requests',
    bypass: 'Dual-Token Cross-Repo',
    ownerTag: 'ĐÃ CÓ (SILVER x3)',
    actionText: 'KÍCH HOẠT PULL SHARK VÀNG',
    action: () => {
      closeDesktopWorkbench();
      closeMobileBadgeSheet();
      scrollToSection('cockpit');
      triggerHarvest();
    },
  },
  galaxy: {
    img: '/badges/galaxy-brain-gold.png',
    tier: 'GOLD TIER x4',
    title: 'Galaxy Brain (Não Thiên Hà)',
    desc: 'Được trao cho người đóng góp có 32 câu trả lời kỹ thuật được đánh dấu là Chấp nhận (Accepted Answer) trong GitHub Discussions.',
    status: 'ĐÃ MỞ KHÓA HOÀN TẤT (32/32)',
    vector: 'GraphQL Discussion Solver',
    bypass: 'Auto Discussion Answer',
    ownerTag: 'ĐÃ SỞ HỮU CẤP TỐI ĐA',
    actionText: 'ĐÃ MỞ KHÓA THÀNH CÔNG',
    action: () => {
      toast.success('Galaxy Brain Gold', 'Huy hiệu này đã đạt cấp tối đa trên hồ sơ của bạn.');
    },
  },
  pair: {
    img: '/badges/pair-extraordinaire.png',
    tier: 'TIER x3 CO-AUTHOR',
    title: 'Pair Extraordinaire',
    desc: 'Được trao cho các nhà phát triển đóng góp đồng tác giả (Co-authored-by) trong các Pull Requests đã merge.',
    status: 'ĐÃ MỞ KHÓA HOÀN TẤT (16/16)',
    vector: 'Git Trailer RFC Co-author',
    bypass: 'Clone Collaboration',
    ownerTag: 'ĐÃ SỞ HỮU',
    actionText: 'ĐÃ MỞ KHÓA THÀNH CÔNG',
    action: () => {
      toast.success('Pair Extraordinaire', 'Đã hoàn thành 16 PRs co-authored với nick clone.');
    },
  },
  quickdraw: {
    img: '/badges/quickdraw.png',
    tier: 'LIGHTNING FAST',
    title: 'Quickdraw',
    desc: 'Đóng Issue hoặc Pull Request trong vòng chưa đầy 5 phút kể từ khi mở.',
    status: 'ĐÃ MỞ KHÓA TỨC THÌ',
    vector: 'Instant Auto-Close API',
    bypass: 'Zero Review Bypass',
    ownerTag: 'ĐÃ SỞ HỮU',
    actionText: 'ĐÃ SỞ HỮU',
    action: () => {
      toast.success('Quickdraw', 'Huy hiệu này đã nằm trên hồ sơ cá nhân của bạn.');
    },
  },
  yolo: {
    img: '/badges/yolo.png',
    tier: 'NO REVIEW MERGE',
    title: 'YOLO',
    desc: 'Tự tin merge một Pull Request mà không cần qua bất kỳ quy trình review code nào.',
    status: 'ĐÃ MỞ KHÓA TỨC THÌ',
    vector: 'Direct Squash Merge',
    bypass: 'Admin Override',
    ownerTag: 'ĐÃ SỞ HỮU',
    actionText: 'ĐÃ SỞ HỮU',
    action: () => {
      toast.success('YOLO', 'Huy hiệu này đã được mở khóa.');
    },
  },
  starstruck: {
    img: '/badges/starstruck-gold.png',
    tier: 'GOLD TIER x4',
    title: 'Starstruck (Cấp Vàng)',
    desc: 'Tạo đột biến ngôi sao (Star spike) trên kho lưu trữ của bạn để mở khóa.',
    status: 'ĐÃ MỞ KHÓA HOÀN TẤT',
    vector: 'Repository Star Accelerator',
    bypass: 'Network Propagation',
    ownerTag: 'ĐÃ SỞ HỮU CẤP TỐI ĐA',
    actionText: 'ĐÃ SỞ HỮU',
    action: () => {
      toast.success('Starstruck Gold', 'Kho lưu trữ của bạn đã đạt huy hiệu Starstruck.');
    },
  },
  sponsor: {
    img: '/badges/github-sponsor.png',
    tier: 'LOCKED BADGE',
    title: 'Public Sponsor (Nhà Tài Trợ)',
    desc: 'Huy hiệu dành riêng cho các nhà phát triển tài trợ cho các lập trình viên mã nguồn mở thông qua GitHub Sponsors.',
    status: 'CHƯA SỞ HỮU (LOCKED)',
    vector: 'GitHub Sponsors Billing',
    bypass: 'Direct Sponsorship',
    ownerTag: 'CHƯA SỞ HỮU',
    actionText: 'CẦN TÀI TRỢ QUA GITHUB SPONSORS',
    action: () => {
      window.open('https://github.com/sponsors', '_blank');
    },
  },
  heart: {
    img: '/badges/heart-on-your-sleeve.png',
    tier: 'LOCKED BADGE',
    title: 'Heart On Your Sleeve',
    desc: 'Thả cảm xúc yêu thích (❤️ reaction) trên commit, pull request hoặc issue của các dự án.',
    status: 'CHƯA SỞ HỮU (LOCKED)',
    vector: 'Reactions GraphQL Mutation',
    bypass: 'Auto Heart Reaction',
    ownerTag: 'CHƯA SỞ HỮU',
    actionText: 'CẦN THẢ TIM TRÊN GITHUB',
    action: () => {
      toast.info('Heart On Your Sleeve', 'Cần thả tim reaction trên các commit hoặc issue.');
    },
  },
  arctic: {
    img: '/badges/pull-shark-silver.png',
    tier: 'HISTORIC ARCHIVE',
    title: 'Arctic Code Vault Contributor',
    desc: 'Huy hiệu lịch sử trao tặng cho các lập trình viên có mã nguồn được lưu trữ trong hầm băng Svalbard Arctic Code Vault vào sự kiện năm 2020.',
    status: 'SỰ KIỆN LỊCH SỬ (ĐÃ KHÓA)',
    vector: '2020 Historic Snapshot',
    bypass: 'Archive Closed',
    ownerTag: 'KHÔNG CÒN MỞ',
    actionText: 'SỰ KIỆN LỊCH SỬ',
    action: () => {
      toast.info('Arctic Code Vault', 'Sự kiện lưu trữ mã Bắc Cực đã diễn ra năm 2020.');
    },
  },
};

let currentSelectedBadge = null;

function inspectBadge(badgeId) {
  playClickSound();
  const info = BADGE_DETAILS[badgeId];
  if (!info) return;

  currentSelectedBadge = info;
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    closeDesktopWorkbench();
    const sheet = document.getElementById('mobile-badge-sheet');
    const imgEl = document.getElementById('mobile-sheet-img');
    const tierEl = document.getElementById('mobile-sheet-tier');
    const titleEl = document.getElementById('mobile-sheet-title');
    const descEl = document.getElementById('mobile-sheet-desc');
    const statusEl = document.getElementById('mobile-sheet-status');
    const vectorEl = document.getElementById('mobile-sheet-vector');

    if (imgEl) imgEl.src = info.img;
    if (tierEl) tierEl.textContent = info.tier;
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;
    if (statusEl) statusEl.textContent = info.status;
    if (vectorEl) vectorEl.textContent = info.vector;

    if (sheet) sheet.style.display = 'flex';
  } else {
    closeMobileBadgeSheet();
    const wb = document.getElementById('desktop-workbench');
    const imgEl = document.getElementById('wb-badge-img');
    const tierEl = document.getElementById('wb-badge-tier');
    const titleEl = document.getElementById('wb-badge-title');
    const descEl = document.getElementById('wb-badge-desc');
    const statusEl = document.getElementById('wb-spec-status');
    const vectorEl = document.getElementById('wb-spec-vector');
    const bypassEl = document.getElementById('wb-spec-bypass');
    const ownerTagEl = document.getElementById('wb-badge-owner-tag');
    const actionTextEl = document.getElementById('wb-action-text');

    if (imgEl) imgEl.src = info.img;
    if (tierEl) tierEl.textContent = info.tier;
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;
    if (statusEl) statusEl.textContent = info.status;
    if (vectorEl) vectorEl.textContent = info.vector;
    if (bypassEl) bypassEl.textContent = info.bypass || 'Standard Flow';
    if (ownerTagEl) ownerTagEl.innerHTML = `<i class="ph-duotone ph-shield-check"></i> ${info.ownerTag || 'GitHub Verified'}`;
    if (actionTextEl) actionTextEl.textContent = info.actionText;

    if (wb) {
      wb.style.display = 'block';
      wb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function filterTrophies(category) {
  playClickSound();
  document.querySelectorAll('.t-filter-btn').forEach((btn) => {
    if (btn.getAttribute('data-cat') === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const cards = document.querySelectorAll('.trophy-item-card');
  cards.forEach((card) => {
    const cardCat = card.getAttribute('data-cat');
    if (category === 'all' || cardCat === category) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function closeDesktopWorkbench() {
  playClickSound();
  const wb = document.getElementById('desktop-workbench');
  if (wb) wb.style.display = 'none';
}

function closeMobileBadgeSheet() {
  playClickSound();
  const sheet = document.getElementById('mobile-badge-sheet');
  if (sheet) sheet.style.display = 'none';
}

function activateBadgeAction() {
  if (currentSelectedBadge && typeof currentSelectedBadge.action === 'function') {
    currentSelectedBadge.action();
  }
}

// ==========================================================================
// 12. TYPEFORM-STYLE ONBOARDING SETUP WIZARD
// ==========================================================================

let wizardStep = 1;
const wizardData = {
  githubToken: '',
  helperGithubToken: '',
  targetRepo: 'github-trophy-vault',
};

function openWizard() {
  playClickSound();
  wizardStep = 1;
  const overlay = document.getElementById('wizard-overlay');
  if (overlay) {
    overlay.style.setProperty('display', 'flex', 'important');
    showWizardStep(1);
  }
}

function closeWizard() {
  playClickSound();
  const overlay = document.getElementById('wizard-overlay');
  if (overlay) {
    overlay.style.setProperty('display', 'none', 'important');
  }
  sessionStorage.setItem('wizard_dismissed', 'true');
}

function toggleTfPassword(inputId, btn) {
  playClickSound();
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPwd = input.type === 'password';
  input.type = isPwd ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPwd ? 'ph-duotone ph-eye-slash' : 'ph-duotone ph-eye';
  }
}

function showWizardStep(step) {
  wizardStep = step;
  
  const fill = document.getElementById('tf-progress-fill');
  if (fill) {
    fill.style.width = `${step * 25}%`;
  }

  document.querySelectorAll('.tf-step-slide').forEach((slide) => {
    slide.classList.remove('active');
  });

  const curSlide = document.getElementById(`tf-step-${step}`);
  if (curSlide) {
    curSlide.classList.add('active');
    const input = curSlide.querySelector('.tf-field') || curSlide.querySelector('.tf-box-field');
    if (input) setTimeout(() => input.focus(), 100);
  }

  if (step === 4) {
    const sumTarget = document.getElementById('tf-sum-target');
    const sumHelper = document.getElementById('tf-sum-helper');
    const sumRepo = document.getElementById('tf-sum-repo');

    if (sumTarget) {
      sumTarget.textContent = wizardData.githubToken 
        ? `${wizardData.githubToken.slice(0, 6)}••••••••` 
        : (globalConfig?.hasGithubToken ? 'Đã có sẵn trong .env' : 'Chưa nhập');
    }
    if (sumHelper) {
      if (wizardData.helperGithubToken) {
        const count = wizardData.helperGithubToken.split('|').filter(Boolean).length;
        sumHelper.textContent = count > 1 
          ? `${count} Token Nick Phụ Đang Hoạt Động (Bypass Multi-Token)` 
          : `${wizardData.helperGithubToken.slice(0, 6)}•••••••• (Dual-Token)`;
      } else {
        sumHelper.textContent = globalConfig?.hasHelperToken ? 'Đã có sẵn trong .env' : 'Không dùng (Đơn nick)';
      }
    }
    if (sumRepo) {
      sumRepo.textContent = wizardData.targetRepo || 'github-trophy-vault';
    }
  }
}

function handleWizardKeyDown(event, step) {
  if (event.key === 'Enter') {
    event.preventDefault();
    advanceWizard(step);
  }
}

function advanceWizard(step, isSkip = false) {
  playClickSound();
  if (step === 1) {
    const val = document.getElementById('tf-input-target')?.value?.trim();
    if (!val && !globalConfig?.hasGithubToken) {
      toast.error('Yêu Cầu Token', 'Vui lòng dán Personal Access Token của tài khoản chính.');
      return;
    }
    if (val) wizardData.githubToken = val;
    showWizardStep(2);
  } else if (step === 2) {
    if (!isSkip) {
      const val = document.getElementById('tf-input-helper')?.value?.trim();
      if (val) wizardData.helperGithubToken = val;
    }
    showWizardStep(3);
  } else if (step === 3) {
    const val = document.getElementById('tf-input-repo')?.value?.trim();
    wizardData.targetRepo = val || 'github-trophy-vault';
    showWizardStep(4);
  }
}

async function finishWizard() {
  playClickSound();
  const payload = {};
  if (wizardData.githubToken) payload.githubToken = wizardData.githubToken;
  if (wizardData.helperGithubToken) payload.helperGithubToken = wizardData.helperGithubToken;
  if (wizardData.targetRepo) payload.targetRepo = wizardData.targetRepo;

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      closeWizard();
      toast.success('Thiết Lập Thành Công!', 'Đã ghi cấu hình vào file .env và sẵn sàng cày huy hiệu.');
      loadConfig();
      loadRecon();
    } else {
      toast.error('Lỗi Lưu Cấu Hình', data.error || 'Không thể lưu vào .env');
    }
  } catch (err) {
    toast.error('Lỗi Kết Nối', err.message);
  }
}

// ==========================================================================
// 13. DIRECT .ENV CONFIG MODAL
// ==========================================================================

function openConfigModal() {
  playClickSound();
  const modal = document.getElementById('config-modal');
  if (modal) modal.style.display = 'flex';
}

function closeConfigModal() {
  playClickSound();
  const modal = document.getElementById('config-modal');
  if (modal) modal.style.display = 'none';
}

function handleModalBackdropClick(e) {
  if (e.target && e.target.classList.contains('config-modal-backdrop')) {
    closeConfigModal();
  }
}

async function saveConfig() {
  playClickSound();
  const targetToken = document.getElementById('cfg-target-token')?.value;
  const helperToken = document.getElementById('cfg-helper-token')?.value;
  const repoName = document.getElementById('cfg-repo-name')?.value;

  const payload = {};
  if (targetToken && targetToken.trim()) payload.githubToken = targetToken.trim();
  if (helperToken && helperToken.trim()) payload.helperGithubToken = helperToken.trim();
  if (repoName && repoName.trim()) payload.targetRepo = repoName.trim();

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      closeConfigModal();
      toast.success('Cấu Hình Đã Lưu', 'Đã cập nhật file .env an toàn.');
      loadConfig();
      loadRecon();
    } else {
      toast.error('Lưu Thất Bại', data.error || 'Lỗi khi lưu cấu hình');
    }
  } catch (err) {
    toast.error('Lỗi', err.message);
  }
}

// ==========================================================================
// 14. KEYBOARD SHORTCUTS & HELPERS
// ==========================================================================

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openConfigModal();
  }
  if (e.key === 'Escape') {
    closeConfigModal();
    closeWizard();
    closeDesktopWorkbench();
    closeMobileBadgeSheet();
  }
});

function scrollToSection(id) {
  playClickSound();
  const elem = document.getElementById(id);
  if (elem) elem.scrollIntoView({ behavior: 'smooth' });

  document.querySelectorAll('.dock-tab').forEach((tab) => tab.classList.remove('active'));
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }
}

// ==========================================================================
// 15. INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  toast.init();
  setupIsometricCursorTracker();
  updateClock();
  setInterval(updateClock, 1000);
  loadConfig();
  loadRecon();
  setupLiveStream();

  // Safety fallback: đảm bảo skeleton không bao giờ bị kẹt trên màn hình
  setTimeout(() => {
    hideGlobalSkeleton();
  }, 1000);
});
