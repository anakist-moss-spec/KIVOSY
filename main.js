// main.js — Main feed logic: poll cards, filtering, sorting
// Renders all polls in Polymarket style with source snippets

(function () {
  'use strict';

  const API_URL = 'https://kivosy-api.anakist-y.workers.dev';
  let globalData = { polls: [], votes: [] }; // 서버 데이터를 담을 그릇

  const CATEGORY_EMOJI = {
    food: '🍗', sports: '⚽', entertainment: '🎬',
    tech: '💻', politics: '🗳️', general: '💬',
  };

  // [수정] 서버에서 전체 데이터를 한 번에 가져오는 함수
  async function fetchServerData() {
    try {
      const response = await fetch(`${API_URL}/api/data`);
      if (!response.ok) throw new Error('Network response was not ok');
      globalData = await response.json();
      return true;
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      return false;
    }
  }

  // ── Data access ───────────────────────────────────────────────────────────
  function getAllPolls() {
    return globalData.polls || [];
  }

  function getVotesForPoll(pollId) {
    return (globalData.votes || []).filter(v => v.pollId === pollId);
  }

  function getTopSources(votes, max = 3) {
    const map = new Map();
    votes.forEach(v => {
      const d = v.source?.domain || 'direct';
      const dn = v.source?.displayName || d;
      if (!map.has(d)) map.set(d, { displayName: dn, total: 0 });
      map.get(d).total++;
    });
    return [...map.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, max)
      .map(([, v]) => v.displayName);
  }

  function computePcts(votes, optA, optB) {
    const a = votes.filter(v => v.choice === optA).length;
    const b = votes.filter(v => v.choice === optB).length;
    const t = a + b;
    if (t === 0) return { a: 50, b: 50, total: 0 };
    return { a: Math.round((a / t) * 100), b: 100 - Math.round((a / t) * 100), total: t };
  }

  function isHot(poll, votes) {
    const age = Date.now() - new Date(poll.createdAt).getTime();
    return (age < 86400000 && votes.length >= 2) || votes.length >= 10;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function renderPollCard(poll) {
    const votes = getVotesForPoll(poll.id);
    const pcts  = computePcts(votes, poll.optionA, poll.optionB);
    const hot   = isHot(poll, votes);
    const topSrc = getTopSources(votes);
    const catEmoji = CATEGORY_EMOJI[poll.category] || '💬';

    const voteUrl = `vote.html?pollId=${poll.id}`;
    const dashUrl = `dashboard.html?pollId=${poll.id}`;

    const card = document.createElement('a');
    card.href = voteUrl;
    card.className = 'poll-card';
    card.setAttribute('data-category', poll.category || 'general');
    card.setAttribute('data-created', poll.createdAt);
    card.setAttribute('data-votes', votes.length);

    const srcSnippets = topSrc.length > 0
      ? topSrc.map(s => `<span class="source-snip">${escHtml(s)}</span>`).join('')
      : '<span class="source-snip">no votes yet</span>';

    card.innerHTML = `
      <div class="poll-card-header">
        <span class="poll-card-title">${escHtml(poll.title)}</span>
        <div class="poll-card-meta">
          ${hot ? '<span class="hot-badge">Hot</span>' : ''}
          <span class="cat-badge">${catEmoji} ${escHtml(poll.category || 'general')}</span>
        </div>
      </div>
      <div class="mini-battle">
        <div class="mini-battle-labels">
          <span class="mini-label-a">${escHtml(poll.optionA)} ${pcts.a}%</span>
          <span class="mini-label-b">${pcts.b}% ${escHtml(poll.optionB)}</span>
        </div>
        <div class="mini-battle-bar">
          <div class="mini-bar-a" style="width:${pcts.a}%"></div>
          <div class="mini-bar-b" style="width:${pcts.b}%"></div>
        </div>
      </div>
      <div class="poll-card-footer">
        <span class="vote-count-badge">
          ${pcts.total > 0 ? `${formatNum(pcts.total)} votes` : 'No votes yet'}
        </span>
        <div class="source-snippets">${srcSnippets}</div>
        <a href="${dashUrl}" class="btn-secondary" style="margin-left:auto;font-size:11px;padding:5px 10px;"
           onclick="event.stopPropagation();">📊</a>
      </div>
    `;

    return card;
  }

  // ── Filter/Sort ───────────────────────────────────────────────────────────
  let activeFilter = 'all';

  function sortPolls(polls) {
    if (activeFilter === 'hot') {
      return [...polls].sort((a, b) => {
        const va = getVotesForPoll(a.id).length;
        const vb = getVotesForPoll(b.id).length;
        return vb - va;
      });
    }
    if (activeFilter === 'new') {
      return [...polls].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt));
    }
    const cats = ['sports', 'food', 'entertainment', 'tech', 'politics'];
    if (cats.includes(activeFilter)) {
      return polls.filter(p => p.category === activeFilter);
    }
    return [...polls].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // ── Filter chips ──────────────────────────────────────────────────────────
  function initFilters() {
    document.getElementById('filter-row')?.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      this.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-accent'));
      chip.classList.add('chip-accent');
      refreshFeed();
    });
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── 메인 렌더링 함수 (refreshFeed만 사용) ─────────────────────────────────
  async function refreshFeed() {
    await fetchServerData(); // 서버에서 최신 데이터 가져오기
    
    const polls = getAllPolls();
    const sorted = sortPolls(polls);
    const list = document.getElementById('polls-list');
    if (!list) return;

    list.innerHTML = '';

    // 상단 카운트 업데이트
    const countEl = document.getElementById('topbar-count');
    if (countEl) countEl.textContent = `${polls.length} poll${polls.length !== 1 ? 's' : ''}`;

    if (sorted.length === 0) {
      list.innerHTML = `
        <div class="state-center" style="padding:48px 20px;">
          <div class="state-icon">🗳️</div>
          <p class="state-title">No polls yet</p>
          <p class="state-sub">Click "+ New Poll" to start your first battle!</p>
        </div>
      `;
      return;
    }

    sorted.forEach(p => list.appendChild(renderPollCard(p)));
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    refreshFeed(); // 최초 로드
  });

  // 3초마다 서버에서 최신 투표 현황을 가져와서 피드를 갱신합니다.
  setInterval(refreshFeed, 3000);

  // 외부(create.js)에서 호출할 수 있게 노출
  window.refreshFeed = refreshFeed;

})();