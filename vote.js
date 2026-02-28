// vote.js — Auto-source detection + vote handling
// THE HEART OF THE PRODUCT: detects EXACT domain from document.referrer

(function () {
  'use strict';

  const API_URL = 'https://kivosy-api.anakist-y.workers.dev';

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

  // ── 서버에서 Poll 데이터 가져오기 (추가됨!) ────────────────────────────────
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

  async function saveVote(pollId, choice) {
    const sourceInfo = detectExactSource();

    const vote = {
      pollId,
      choice,
      source: sourceInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

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
    const protocol = window.location.protocol;  // 'https:'
    const hostname = window.location.hostname;  // 'kivosy.com'
    const port = window.location.port ? ':' + window.location.port : '';
    
    // 안전하게 대시보드 URL 생성
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
        content.querySelectorAll('[data-choice]').forEach(b => {
          b.disabled = true;
          b.style.opacity = '0.45';
          b.style.transform = 'none';
        });

        const choice = this.dataset.choice;
        await saveVote(poll.id, choice);

        document.getElementById('vote-success').style.display = '';
        document.getElementById('success-label').textContent = `Voted: ${choice} 🔥`;
        content.querySelector('.vote-buttons').style.display = 'none';

        setTimeout(() => {
          window.location.href = buildDashUrl(poll.id);
        }, 1100);
      });
    });
  }

  // ── Init (서버 연동 버전) ─────────────────────────────────────────────────
  async function init() {  // async 추가!
    const params = new URLSearchParams(window.location.search);
    const pollId = params.get('pollId');

    if (!pollId) {
      renderError('No poll ID', 'Check your link and try again.');
      return;
    }

    // [핵심 수정] 서버에서 Poll 데이터 가져오기
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