// vote.js — Auto-source detection + vote handling
// THE HEART OF THE PRODUCT: detects EXACT domain from document.referrer

(function () {
  'use strict';

  const API_URL = 'https://kivosy-api.anakist-y.workers.dev';
  let hasVoted = false;  // [추가] 중복투표 방지 플래그

  // ── Source Detection ───────────────────────────────────────────────────────
  function detectExactSource() {
    const referrer = document.referrer || '';

    if (!referrer) {
      return {
        type:        'direct',
        domain:      'direct',
        displayName: '🔗 Direct Link',
        fullUrl:     null,
        path:        null,
      };
    }

    try {
      const url    = new URL(referrer);
      const domain = url.hostname;
      const path   = url.pathname;

      return {
        type:        'web',
        domain:      domain,
        displayName: friendlyName(domain),
        fullUrl:     referrer,
        path:        path,
      };
    } catch (e) {
      return {
        type:        'unknown',
        domain:      'unknown-source',
        displayName: '🔗 Unknown Source',
        fullUrl:     referrer,
        path:        null,
      };
    }
  }

  function friendlyName(domain) {
    if (!domain || domain === 'direct') return '🔗 Direct';

    const map = [
      [/^(twitter\.com|x\.com|t\.co)$/,           '🐦 X/Twitter'],
      [/instagram\.com/,                            '📸 Instagram'],
      [/^(dcinside\.com)/,                          '🎮 DCInside'],
      [/reddit\.com/,                               '👽 Reddit'],
      [/discord\.com/,                              '💬 Discord'],
      [/kakao\.com/,                                '💬 KakaoTalk'],
      [/youtube\.com/,                              '📺 YouTube'],
      [/facebook\.com/,                             '📘 Facebook'],
      [/tiktok\.com/,                               '🎵 TikTok'],
      [/namu\.wiki/,                                '📚 NamuWiki'],
      [/theqoo\.net/,                               '🌸 Theqoo'],
      [/fmkorea\.com/,                              '🏆 FMKorea'],
      [/mlbpark\.com/,                              '⚾ MLBPark'],
      [/chat\.deepseek\.com/,                       '🤖 DeepSeek Chat'],
      [/claude\.ai/,                                '🤖 Claude'],
      [/chatgpt\.com|chat\.openai\.com/,            '🤖 ChatGPT'],
      [/cafe\.naver\.com/,                          '🌐 Naver Cafe'],
      [/blog\.naver\.com/,                          '🌐 Naver Blog'],
      [/naver\.com/,                                '🌐 Naver'],
      [/daum\.net/,                                 '🌐 Daum'],
      [/news\.ycombinator\.com/,                    '🟠 Hacker News'],
      [/linkedin\.com/,                             '💼 LinkedIn'],
      [/threads\.net/,                              '🧵 Threads'],
      [/t\.me|telegram\.org/,                       '✈️ Telegram'],
      [/whatsapp\.com/,                             '📱 WhatsApp'],
      [/line\.me/,                                  '💚 Line'],
      [/weibo\.com/,                                '🇨🇳 Weibo'],
    ];

    for (const [pattern, label] of map) {
      if (pattern.test(domain)) return label;
    }

    const clean = domain.replace(/^www\./, '');
    const first = clean.split('.')[0];
    const label = first.charAt(0).toUpperCase() + first.slice(1);
    return `🌐 ${label}`;
  }

  // ── 서버에서 Poll 데이터 가져오기 ──────────────────────────────────────────
  async function getPollFromServer(pollId) {
    try {
      const response = await fetch(`${API_URL}/api/data`);
      const data = await response.json();
      return data.polls.find(p => p.id === pollId) || null;
    } catch (err) {
      console.error("서버 Poll 로드 실패:", err);
      return null;
    }
  }

  // ── 토스트 메시지 함수 (추가) ──────────────────────────────────────────────
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  // [수정] deviceId 추가된 saveVote 함수
  async function saveVote(pollId, choice) {
    const sourceInfo = detectExactSource();
    
    // [추가] deviceId 가져오기
    const deviceId = localStorage.getItem('vv_device_id') || 'unknown';

    const vote = {
      pollId,
      choice,
      deviceId,  // ✅ deviceId 추가!
      source: sourceInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    console.log('투표 데이터 (deviceId 포함):', vote); // 디버깅

    // 서버에 저장
    try {
      await fetch(`${API_URL}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vote)
      });
    } catch (err) {
      console.error('서버 저장 실패:', err);
    }

    // 로컬에도 저장 (오프라인 대비)
    const key = `vv_votes_${pollId}`;
    const votes = JSON.parse(localStorage.getItem(key) || '[]');
    votes.push(vote);
    localStorage.setItem(key, JSON.stringify(votes));

    return vote;
  }

  function buildDashUrl(pollId) {
    // 현재 URL에서 프로토콜 + 도메인 추출
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? ':' + window.location.port : '';
    
    return `${protocol}//${hostname}${port}/dashboard.html?pollId=${pollId}`;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderError(message, sub) {
    document.getElementById('vote-content').innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <p class="state-title">${escHtml(message)}</p>
        <p class="state-sub">${escHtml(sub || '')}</p>
        <a href="index.html" class="btn-primary" style="margin-top:16px;max-width:200px;display:block;text-align:center;text-decoration:none;">
          Create New Poll
        </a>
      </div>
    `;
  }

  function renderVote(poll, sourceInfo) {
    const content = document.getElementById('vote-content');

    content.innerHTML = `
      <div class="source-banner">
        <span class="source-banner-dot"></span>
        Arrived from: <strong>${escHtml(sourceInfo.displayName)}</strong>
        ${sourceInfo.domain !== 'direct' ? `<span style="font-size:10px;opacity:0.6;margin-left:4px;">(${escHtml(sourceInfo.domain)})</span>` : ''}
      </div>

      <div class="trust-banner">
        <div class="trust-icon">🔒</div>
        <div class="trust-text">
          <strong>Privacy Promise</strong>
          <ul>
            <li>No email, name, or phone collected</li>
            <li>Only vote + source platform stored (for community stats)</li>
            <li>Data auto-deleted after 90 days</li>
          </ul>
        </div>
      </div>

      <h1 class="vote-title">${escHtml(poll.title)}</h1>

      <div class="vote-buttons">
        <button class="btn-vote-a" data-choice="${escHtml(poll.optionA)}">
          ${escHtml(poll.optionA)}
        </button>
        <p class="vs-label">— VS —</p>
        <button class="btn-vote-b" data-choice="${escHtml(poll.optionB)}">
          ${escHtml(poll.optionB)}
        </button>
      </div>

      <div id="vote-success" style="display:none; margin-top:24px;" class="state-center">
        <div class="state-icon">🔥</div>
        <p class="state-title" id="success-label">Voted!</p>
        <p class="state-sub">Redirecting to live results…</p>
      </div>
    `;

    content.querySelectorAll('[data-choice]').forEach(btn => {
      btn.addEventListener('click', async function () {
        // [수정] 이미 투표했는지 확인
        if (hasVoted) {
          showToast('Already voted!');
          return;
        }
        
        hasVoted = true;  // 투표 완료 표시

        // Disable all buttons immediately
        content.querySelectorAll('[data-choice]').forEach(b => {
          b.disabled = true;
          b.style.opacity = '0.45';
          b.style.transform = 'none';
        });

        const choice = this.dataset.choice;
        
        console.log('투표 시작! poll.id:', poll.id); // [디버깅]
        
        await saveVote(poll.id, choice);

        console.log('투표 저장 완료!'); // [디버깅]
        
        const dashUrl = buildDashUrl(poll.id);
        console.log('리다이렉트 URL:', dashUrl); // [디버깅]

        document.getElementById('vote-success').style.display = '';
        document.getElementById('success-label').textContent = `Voted: ${choice} 🔥`;
        content.querySelector('.vote-buttons').style.display = 'none';

        setTimeout(() => {
          console.log('리다이렉트 실행!'); // [디버깅]
          window.location.href = dashUrl;
        }, 1100);
      });
    });
  }

  // ── Init (서버 연동 버전) ─────────────────────────────────────────────────
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const pollId = params.get('pollId');

    if (!pollId) {
      renderError('No poll ID', 'Check your link and try again.');
      return;
    }

    // 서버에서 Poll 데이터 가져오기
    const poll = await getPollFromServer(pollId);
    
    if (!poll) {
      renderError('Poll not found', `Poll "${pollId}" doesn't exist or has been deleted.`);
      return;
    }

    // Detect source NOW (while referrer is still accurate)
    const sourceInfo = detectExactSource();

    renderVote(poll, sourceInfo);
  }

  document.addEventListener('DOMContentLoaded', init);

})();