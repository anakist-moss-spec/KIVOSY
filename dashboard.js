// dashboard.js — Data aggregation + dynamic source visualization
// Shows EVERY source domain. NO "other" category. Ever.

(function () {
  'use strict';

  const API_URL = 'https://kivosy-api.anakist-y.workers.dev';

  let pollId        = null;
  let poll          = null;
  let interval      = null;
  let isFirstRender = true;  // tracks whether bars should animate

  // ── URL / Data ─────────────────────────────────────────────────────────────

  function getParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  // [서버 연결] 서버에서 특정 투표(Poll) 정보를 가져옵니다.
  async function getPollFromServer(id) {
    try {
      const response = await fetch(`${API_URL}/api/data`);
      const data = await response.json();
      return data.polls.find(p => p.id === id) || null;
    } catch (err) {
      console.error("Poll 로드 실패:", err);
      return null;
    }
  }

  async function getVotesFromServer(id) {
    try {
      const response = await fetch(`${API_URL}/api/data`);
      const data = await response.json();
      // 전체 투표 데이터 중 현재 pollId에 해당하는 것만 골라냅니다.
      return data.votes.filter(v => v.pollId === id);
    } catch (err) {
      console.error("투표 데이터 로드 실패:", err);
      return [];
    }
  }

  // ── Aggregation ────────────────────────────────────────────────────────────

  function aggregate(votes, currentPoll) {
    const total  = { A: 0, B: 0 };
    // sourceMap: domain → { displayName, domain, fullUrl, votes: {A, B}, total }
    const sourceMap = new Map();

    votes.forEach(vote => {
      const isA = vote.choice === currentPoll.optionA;
      if (isA) total.A++; else total.B++;

      const src    = vote.source || {};
      const domain = src.domain || 'direct';
      const dn     = src.displayName || domain;
      const fu     = src.fullUrl || null;

      if (!sourceMap.has(domain)) {
        sourceMap.set(domain, {
          displayName:    dn,
          domain:         domain,
          fullUrl:        fu,
          votes:          { A: 0, B: 0 },
          total:          0,
        });
      }

      const entry = sourceMap.get(domain);
      // Update display name if this vote has a better one
      if (dn && dn !== domain) entry.displayName = dn;
      if (fu && !entry.fullUrl) entry.fullUrl = fu;
      if (isA) entry.votes.A++; else entry.votes.B++;
      entry.total++;
    });

    // Sort by total votes descending
    const sortedSources = [...sourceMap.entries()]
      .sort((a, b) => b[1].total - a[1].total);

    return { total, sortedSources, totalVotes: votes.length };
  }

  function pct(a, b) {
    const t = a + b;
    if (t === 0) return { a: 50, b: 50 };
    const pa = Math.round((a / t) * 100);
    return { a: pa, b: 100 - pa };
  }

  function fmt(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── Share text ─────────────────────────────────────────────────────────────
  function generateShareText(agg) {
    const t = pct(agg.total.A, agg.total.B);
    const voteUrl = window.location.href
      .replace('dashboard.html', 'vote.html')
      .replace(/\?.*$/, '') + `?pollId=${pollId}`;

    // 텍스트 자동 줄이기 함수 (10자로)
    function shorten(text, maxLen = 10) {
      if (!text) return '';
      const str = String(text);
      if (str.length <= maxLen) return str;
      return str.substring(0, maxLen - 1) + '…';
    }

    // 승자 표시 (짧게)
    const winner = t.a > t.b ? poll.optionA : t.b > t.a ? poll.optionB : null;
    const winnerShort = winner ? shorten(winner) : '';
    const winnerLine = winner
      ? `🏆 ${winnerShort} (${Math.max(t.a, t.b)}%)`
      : `🤝 Tie!`;

    // 간단한 바 (10칸)
    const barA = '█'.repeat(Math.round(t.a / 10)) + '░'.repeat(10 - Math.round(t.a / 10));
    const barB = '█'.repeat(Math.round(t.b / 10)) + '░'.repeat(10 - Math.round(t.b / 10));

    let lines = [];
    lines.push(`🔥 "${shorten(poll.title, 30)}"`);
    lines.push(`📊 ${agg.totalVotes} votes · ${winnerLine}`);
    lines.push(`───────────────────────`);
    lines.push(`${shorten(poll.optionA)} ${t.a}%  ${barA}`);
    lines.push(`${shorten(poll.optionB)} ${t.b}%  ${barB}`);
    
    // 소스별 결과 - 원하는 형식으로!
    const topSources = agg.sortedSources.slice(0, 5);
    if (topSources.length > 0) {
      lines.push(`───────────────────────`);
      lines.push(`📱 Sources:`);
      topSources.forEach(([, data]) => {
        const sp = pct(data.votes.A, data.votes.B);
        // direct : Big Change 100% / Status Quo 0%
        lines.push(`  ${data.displayName} : ${shorten(poll.optionA)} ${sp.a}% / ${shorten(poll.optionB)} ${sp.b}%`);
      });
    }
    
    lines.push(`───────────────────────`);
    lines.push(`🗳️ ${voteUrl}`);
    
    return lines.join('\n');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderError(title, sub) {
    document.getElementById('dash-content').innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <p class="state-title">${escHtml(title)}</p>
        <p class="state-sub">${escHtml(sub || '')}</p>
        <a href="index.html" class="btn-primary"
           style="margin-top:16px;max-width:200px;display:block;text-align:center;text-decoration:none;">
          Back to Feed
        </a>
      </div>
    `;
  }

  function renderEmpty() {
    const voteUrl = window.location.href
      .replace('dashboard.html', 'vote.html')
      .replace(/\?.*$/, '') + `?pollId=${pollId}`;

    document.getElementById('dash-content').innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:4px;">${escHtml(poll.title)}</h2>
      <p style="font-size:12px;color:var(--muted);margin-bottom:24px;font-family:var(--font-mono);">
        ${escHtml(poll.optionA)} vs ${escHtml(poll.optionB)}
      </p>
      <div class="state-center" style="padding:40px 0;">
        <div class="state-icon">🕳️</div>
        <p class="state-title">No votes yet</p>
        <p class="state-sub">Be the first! Share your link and watch sources appear here.</p>
        <a href="${escHtml(voteUrl)}" class="btn-primary"
           style="margin-top:16px;max-width:200px;display:block;text-align:center;text-decoration:none;">
          Cast First Vote
        </a>
      </div>
    `;
  }

  // ── Shared helper: build source cards HTML ────────────────────────────────

  function buildSourceCardsHtml(agg) {
    if (agg.sortedSources.length === 0) {
      return `<p style="font-size:12px;color:var(--muted);">No source data yet.</p>`;
    }
    let html = '';
    agg.sortedSources.forEach(([, data]) => {
      const sp = pct(data.votes.A, data.votes.B);
      const urlLine = (data.fullUrl && data.domain !== 'direct')
        ? `<div class="source-domain-raw" title="${escHtml(data.fullUrl)}">
             ${escHtml(data.fullUrl.length > 55 ? data.fullUrl.slice(0, 55) + '…' : data.fullUrl)}
           </div>`
        : `<div class="source-domain-raw">${escHtml(data.domain)}</div>`;

      html += `
        <div class="source-card">
          <div class="source-card-head">
            <span class="source-display-name">${escHtml(data.displayName)}</span>
            <span class="source-vote-count">${fmt(data.total)} vote${data.total !== 1 ? 's' : ''}</span>
          </div>
          ${urlLine}
          <div class="source-mini-bar">
            <div class="source-mini-a" style="width:${sp.a}%"></div>
            <div class="source-mini-b" style="width:${sp.b}%"></div>
          </div>
          <div class="source-pct-row">
            <span class="pct-a">${escHtml(poll.optionA)} ${sp.a}%</span>
            <span class="pct-b">${sp.b}% ${escHtml(poll.optionB)}</span>
          </div>
        </div>
      `;
    });
    return html;
  }

  // ── Full render (initial load only) ──────────────────────────────────────

  function renderDash(agg) {
    const t         = pct(agg.total.A, agg.total.B);
    const shareText = generateShareText(agg);

    document.getElementById('dash-content').innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:4px;">${escHtml(poll.title)}</h2>
      <p style="font-size:12px;color:var(--muted);margin-bottom:20px;font-family:var(--font-mono);">
        Poll ID: ${escHtml(pollId)}
      </p>

      <div class="dash-totals">
        <div class="stat-box">
          <div class="stat-label">Total Votes</div>
          <div class="stat-value" id="stat-total-votes">${fmt(agg.totalVotes)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Sources</div>
          <div class="stat-value" id="stat-sources">${agg.sortedSources.length}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <p class="section-heading" style="margin-bottom:14px;">Overall Results</p>
        <div class="result-row">
          <div class="result-header">
            <span class="result-name opt-a">${escHtml(poll.optionA)}</span>
            <span class="result-stat" id="stat-a"><strong>${t.a}%</strong> · ${fmt(agg.total.A)} votes</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar opt-a" id="bar-a" style="width:0%"></div>
          </div>
        </div>
        <div class="result-row" style="margin-top:14px;">
          <div class="result-header">
            <span class="result-name opt-b">${escHtml(poll.optionB)}</span>
            <span class="result-stat" id="stat-b"><strong>${t.b}%</strong> · ${fmt(agg.total.B)} votes</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar opt-b" id="bar-b" style="width:0%"></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <p class="section-heading" id="source-heading" style="margin-bottom:14px;">
          By Source — ${agg.sortedSources.length} platform${agg.sortedSources.length !== 1 ? 's' : ''}
        </p>
        <div class="source-grid" id="source-grid">${buildSourceCardsHtml(agg)}</div>
      </div>

      <div class="card">
        <p class="section-heading" style="margin-bottom:12px;">Share Results</p>
        <div class="share-box" id="share-box">${escHtml(shareText)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-primary" id="btn-copy-share" style="flex:1;min-width:120px;">
            📋 Copy Results
          </button>
          <button class="btn-save-image" id="btn-save-image">
            📸 Save Image
          </button>
        </div>
      </div>
    `;

    // Bars animate FROM 0 → target on first render only
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const barA = document.getElementById('bar-a');
        const barB = document.getElementById('bar-b');
        if (barA) barA.style.width = t.a + '%';
        if (barB) barB.style.width = t.b + '%';
      });
    });

    // Wire copy button
    document.getElementById('btn-copy-share')?.addEventListener('click', function () {
      copyText(shareText).then(() => {
        this.textContent = '✓ Copied!';
        setTimeout(() => { this.textContent = '📋 Copy Results'; }, 2200);
      });
    });

    // Wire save image button
    document.getElementById('btn-save-image')?.addEventListener('click', function () {
      this.disabled = true;
      this.textContent = '⏳ Generating…';
      const btn = this;
      generateResultImage(agg).then(() => {
        btn.disabled = false;
        btn.textContent = '📸 Save Image';
      }).catch(() => {
        btn.disabled = false;
        btn.textContent = '📸 Save Image';
        showToast('Image generation failed — try again');
      });
    });

    // Topbar
    const countEl = document.getElementById('topbar-vote-count');
    if (countEl) countEl.textContent = `${fmt(agg.totalVotes)} votes`;
  }

  // ── Targeted update (subsequent refreshes — NO full re-render, NO animation) ──

  function updateDash(agg) {
    const t         = pct(agg.total.A, agg.total.B);
    const shareText = generateShareText(agg);

    // Stat boxes
    const tvEl  = document.getElementById('stat-total-votes');
    const srcEl = document.getElementById('stat-sources');
    if (tvEl)  tvEl.textContent  = fmt(agg.totalVotes);
    if (srcEl) srcEl.textContent = agg.sortedSources.length;

    // Number labels (no bar movement)
    const statA = document.getElementById('stat-a');
    const statB = document.getElementById('stat-b');
    if (statA) statA.innerHTML = `<strong>${t.a}%</strong> · ${fmt(agg.total.A)} votes`;
    if (statB) statB.innerHTML = `<strong>${t.b}%</strong> · ${fmt(agg.total.B)} votes`;

    // Bars — snap to position, no CSS transition
    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    if (barA) { barA.style.transition = 'none'; barA.style.width = t.a + '%'; }
    if (barB) { barB.style.transition = 'none'; barB.style.width = t.b + '%'; }

    // Source section heading + cards
    const srcHeading = document.getElementById('source-heading');
    if (srcHeading) srcHeading.textContent =
      `By Source — ${agg.sortedSources.length} platform${agg.sortedSources.length !== 1 ? 's' : ''}`;

    const grid = document.getElementById('source-grid');
    if (grid) grid.innerHTML = buildSourceCardsHtml(agg);

    // Share text
    const shareBox = document.getElementById('share-box');
    if (shareBox) shareBox.textContent = shareText;

    // Topbar
    const countEl = document.getElementById('topbar-vote-count');
    if (countEl) countEl.textContent = `${fmt(agg.totalVotes)} votes`;
  }

  // ── Result Image Generator (Feature 2) ────────────────────────────────────
  // Renders a 1080×1080 canvas image with poll results + platform breakdown,
  // then triggers a PNG download. Pure Canvas — no external libraries needed.

  function generateResultImage(agg) {
    return new Promise(function (resolve, reject) {
      try {
        const W = 1080, H = 1080;
        const canvas = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // ── Colours (matching CSS design tokens) ──
        const C = {
          bg:       '#F5F5F7',
          surface:  '#FFFFFF',
          border:   '#E5E5EA',
          text:     '#1D1D1F',
          textSec:  '#3A3A3C',
          muted:    '#86868B',
          accent:   '#0071E3',
          red:      '#FF3B30',
          green:    '#34C759',
          orange:   '#FF9500',
        };

        const t = pct(agg.total.A, agg.total.B);

        // ── Background ──
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);

        // ── White card ──
        roundRect(ctx, 40, 40, W - 80, H - 80, 32, C.surface);
        ctx.strokeStyle = C.border;
        ctx.lineWidth = 1.5;
        roundRectStroke(ctx, 40, 40, W - 80, H - 80, 32);

        // ── Top accent bar ──
        const grad = ctx.createLinearGradient(40, 0, W - 40, 0);
        grad.addColorStop(0, C.accent);
        grad.addColorStop(1, '#34AADC');
        roundRect(ctx, 40, 40, W - 80, 6, [6, 6, 0, 0], grad);

        // ── VibeVote wordmark ──
        ctx.font = '600 26px Inter, -apple-system, sans-serif';
        ctx.fillStyle = C.muted;
        ctx.letterSpacing = '2px';
        ctx.fillText('VIBEVOTE', 80, 110);

        // ── Poll title ──
        ctx.fillStyle = C.text;
        ctx.font = '700 46px Inter, -apple-system, sans-serif';
        const titleLines = wrapText(ctx, poll.title, W - 160, 46);
        let titleY = 168;
        titleLines.forEach(function (line) {
          ctx.fillText(line, 80, titleY);
          titleY += 58;
        });

        // ── Total vote count ──
        const statsY = titleY + 16;
        ctx.font = '500 28px Inter, -apple-system, sans-serif';
        ctx.fillStyle = C.muted;
        ctx.fillText(`${fmt(agg.totalVotes)} votes total · ${agg.sortedSources.length} platform${agg.sortedSources.length !== 1 ? 's' : ''}`, 80, statsY);

        // ── Main battle bar ──
        const barY  = statsY + 44;
        const barH  = 28;
        const barW  = W - 160;

        // Option A fill
        roundRect(ctx, 80, barY, barW, barH, 8, C.border);
        if (t.a > 0) {
          const aW = Math.max(8, Math.round((t.a / 100) * barW));
          roundRect(ctx, 80, barY, aW, barH, t.a >= 98 ? 8 : [8, 0, 0, 8], C.accent);
        }
        if (t.b > 0) {
          const bW  = Math.max(8, Math.round((t.b / 100) * barW));
          const bX  = W - 80 - bW;
          roundRect(ctx, bX, barY, bW, barH, t.b >= 98 ? 8 : [0, 8, 8, 0], C.red);
        }

        // ── Labels below bar ──
        const labelY = barY + barH + 28;
        ctx.font = '700 36px Inter, -apple-system, sans-serif';

        ctx.fillStyle = C.accent;
        ctx.textAlign = 'left';
        ctx.fillText(`${poll.optionA}`, 80, labelY);

        ctx.fillStyle = C.red;
        ctx.textAlign = 'right';
        ctx.fillText(`${poll.optionB}`, W - 80, labelY);

        ctx.textAlign = 'left';
        ctx.font = '600 28px Inter, -apple-system, sans-serif';
        ctx.fillStyle = C.accent;
        ctx.fillText(`${t.a}%`, 80, labelY + 36);
        ctx.fillStyle = C.red;
        ctx.textAlign = 'right';
        ctx.fillText(`${t.b}%`, W - 80, labelY + 36);
        ctx.textAlign = 'left';

        // ── Winner banner (if not tie) ──
        const winner = t.a > t.b ? poll.optionA : t.b > t.a ? poll.optionB : null;
        let winnerY = labelY + 80;
        if (winner) {
          const winCol = t.a > t.b ? C.accent : C.red;
          ctx.font = '600 22px Inter, -apple-system, sans-serif';
          ctx.fillStyle = winCol;
          ctx.fillText(`🏆 Leading: ${winner} (${Math.max(t.a, t.b)}%)`, 80, winnerY);
          winnerY += 40;
        }

        // ── Platform breakdown (top 6) ──
        const srcY    = winnerY + 20;
        const sources = agg.sortedSources.slice(0, 6);

        ctx.font = '600 20px Inter, -apple-system, sans-serif';
        ctx.fillStyle = C.muted;
        ctx.fillText('BY PLATFORM', 80, srcY);

        const colW   = (W - 160 - 20) / 2;
        const rowH   = 84;
        const srcStartY = srcY + 20;

        sources.forEach(function ([, data], i) {
          const col    = i % 2;
          const row    = Math.floor(i / 2);
          const cardX  = 80 + col * (colW + 20);
          const cardY  = srcStartY + row * (rowH + 12);
          const sp     = pct(data.votes.A, data.votes.B);

          // Card bg
          roundRect(ctx, cardX, cardY, colW, rowH, 12, '#F5F5F7');
          ctx.strokeStyle = C.border;
          ctx.lineWidth = 1;
          roundRectStroke(ctx, cardX, cardY, colW, rowH, 12);

          // Platform name
          ctx.font = '600 18px Inter, -apple-system, sans-serif';
          ctx.fillStyle = C.text;
          ctx.fillText(
            data.displayName.length > 20
              ? data.displayName.slice(0, 19) + '…'
              : data.displayName,
            cardX + 14, cardY + 26
          );

          // Vote count
          ctx.font = '500 14px Inter, -apple-system, sans-serif';
          ctx.fillStyle = C.muted;
          ctx.textAlign = 'right';
          ctx.fillText(`${data.total}v`, cardX + colW - 12, cardY + 26);
          ctx.textAlign = 'left';

          // Mini bar
          const mBarX = cardX + 14;
          const mBarY = cardY + 36;
          const mBarW = colW - 28;
          const mBarH = 6;
          roundRect(ctx, mBarX, mBarY, mBarW, mBarH, 3, C.border);
          if (sp.a > 0) {
            const aW = Math.max(3, Math.round((sp.a / 100) * mBarW));
            roundRect(ctx, mBarX, mBarY, aW, mBarH, [3, 0, 0, 3], C.accent);
          }

          // Pcts
          ctx.font = '600 14px Inter, -apple-system, sans-serif';
          ctx.fillStyle = C.accent;
          ctx.fillText(`${sp.a}%`, mBarX, cardY + 68);
          ctx.fillStyle = C.red;
          ctx.textAlign = 'right';
          ctx.fillText(`${sp.b}%`, cardX + colW - 14, cardY + 68);
          ctx.textAlign = 'left';
        });

        // ── Footer: URL ──
        ctx.font = '500 22px Inter, -apple-system, sans-serif';
        ctx.fillStyle = C.muted;
        ctx.textAlign = 'center';
        ctx.fillText('kivosy.com', W / 2, H - 58);
        ctx.textAlign = 'left';

        // ── Download ──
        canvas.toBlob(function (blob) {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = `vibevote-${pollId}-results.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
          resolve();
        }, 'image/png');

      } catch (err) {
        reject(err);
      }
    });
  }

  // Canvas helpers ────────────────────────────────────────────────────────────

  // Draw a filled rounded rectangle.
  // radii can be a number (uniform) or [tl, tr, br, bl] array.
  function roundRect(ctx, x, y, w, h, radii, fill) {
    const r = normaliseRadii(radii, w, h);
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function roundRectStroke(ctx, x, y, w, h, radii) {
    roundRect(ctx, x, y, w, h, radii, undefined);
    ctx.stroke();
  }

  function normaliseRadii(radii, w, h) {
    const max = Math.min(w, h) / 2;
    function clamp(v) { return Math.min(v, max); }
    if (typeof radii === 'number') {
      const r = clamp(radii);
      return { tl: r, tr: r, br: r, bl: r };
    }
    return {
      tl: clamp(radii[0] || 0),
      tr: clamp(radii[1] || 0),
      br: clamp(radii[2] || 0),
      bl: clamp(radii[3] || 0),
    };
  }

  // Wrap text into lines that fit within maxWidth
  function wrapText(ctx, text, maxWidth, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (let i = 0; i < words.length; i++) {
      const test = current ? current + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = words[i];
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  async function refresh() {
    if (!pollId) return;

    // 서버에서 데이터를 가져올 때까지 기다립니다.
    const votes = await getVotesFromServer(pollId);

    if (votes.length === 0) {
      renderEmpty();
      isFirstRender = true;
      return;
    }

    const agg = aggregate(votes, poll);

    if (isFirstRender) {
      renderDash(agg);
      isFirstRender = false;
    } else {
      updateDash(agg);
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2200);
  }

  // ── Init (서버 버전) ───────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async function () { // async 추가
    pollId = getParam('pollId');

    if (!pollId) {
      renderError('No Poll ID', 'The URL is missing a pollId parameter.');
      return;
    }

    // [수정] 이제 서버에서 가져올 때까지 기다립니다(await).
    poll = await getPollFromServer(pollId); 
    
    if (!poll) {
      renderError('Poll Not Found', `Poll "${pollId}" doesn't exist or was deleted.`);
      return;
    }

    // 로딩바 제거
    document.getElementById('progress-bar')?.classList.remove('loading');

    // 첫 렌더링 (서버에서 투표 데이터를 가져옵니다)
    await refresh(); 

    // 버튼 연결 (새 투표 만들기)
    const indexUrl = window.location.href.replace('dashboard.html', 'index.html').replace(/\?.*$/, '');
    document.getElementById('btn-new-poll')?.addEventListener('click', () => {
      window.location.href = indexUrl;
    });

    // ── 실시간 업데이트: 3초마다 서버에서 새 투표가 있는지 확인 ──
    interval = setInterval(refresh, 3000); 
  });

})();