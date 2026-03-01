// main.js — Main feed logic: poll cards, filtering, sorting
// Renders all polls in Polymarket style with source snippets

(function () {
  'use strict';

  const API_URL = 'https://kivosy-api.anakist-y.workers.dev';
  let globalData = { polls: [], votes: [] };
  let searchTerm = '';
  let activeFilter = 'all';
  let viewMode = 'all';
  let refreshInterval = null; // [추가] 인터벌 저장

  const CATEGORY_EMOJI = {
    food: '🍗', sports: '⚽', entertainment: '🎬',
    tech: '💻', politics: '🗳️', general: '💬',
  };

  // [신규] 기기 식별자 함수
  function getDeviceId() {
    let deviceId = localStorage.getItem('vv_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      localStorage.setItem('vv_device_id', deviceId);
    }
    return deviceId;
  }

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

  function getAllPolls() {
    return globalData.polls || [];
  }

  function getVotesForPoll(pollId) {
    return (globalData.votes || []).filter(v => v.pollId === pollId);
  }

  // [수정] 내가 투표한 poll ID 목록 가져오기 (서버 기반)
  async function getMyVotedPollIds() {
    const deviceId = getDeviceId();
    try {
      const response = await fetch(`${API_URL}/api/my-votes?deviceId=${deviceId}`);
      if (!response.ok) throw new Error('Failed to fetch my votes');
      const data = await response.json();
      return data.map(v => v.pollId);
    } catch (err) {
      console.error("내 투표 목록 로드 실패:", err);
      return [];
    }
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
  async function filterAndSortPolls(polls) {
    let filtered = [...polls];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.optionA.toLowerCase().includes(searchTerm) ||
        p.optionB.toLowerCase().includes(searchTerm)
      );
    }
    
    if (viewMode === 'myVotes') {
      const myVotedIds = await getMyVotedPollIds();
      filtered = filtered.filter(p => myVotedIds.includes(p.id));
    }
    
    if (viewMode === 'trending') {
      filtered.sort((a, b) => {
        const va = getVotesForPoll(a.id).length;
        const vb = getVotesForPoll(b.id).length;
        return vb - va;
      });
    } else if (activeFilter === 'hot') {
      filtered.sort((a, b) => {
        const va = getVotesForPoll(a.id).length;
        const vb = getVotesForPoll(b.id).length;
        return vb - va;
      });
    } else if (activeFilter === 'new') {
      filtered.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return filtered;
  }

  function initFilters() {
    document.getElementById('filter-row')?.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      viewMode = 'all';
      this.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-accent'));
      chip.classList.add('chip-accent');
      refreshFeed();
    });
  }

  function initSearchAndView() {
    document.getElementById('search-btn')?.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      searchTerm = input.value.trim().toLowerCase();
      viewMode = 'all';
      refreshFeed();
    });
    
    document.getElementById('search-input')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        searchTerm = e.target.value.trim().toLowerCase();
        viewMode = 'all';
        refreshFeed();
      }
    });
    
    document.getElementById('btn-my-votes')?.addEventListener('click', () => {
      viewMode = 'myVotes';
      searchTerm = '';
      document.getElementById('search-input').value = '';
      refreshFeed();
    });
    
    document.getElementById('btn-trending')?.addEventListener('click', () => {
      viewMode = 'trending';
      searchTerm = '';
      document.getElementById('search-input').value = '';
      refreshFeed();
    });
  }

  // [추가] 리프레시 시작 함수
  function startRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshFeed, 30000); // 30초로 증가!
  }

  // [추가] 리프레시 중지 함수
  function stopRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  async function refreshFeed() {
    await fetchServerData();
    
    const polls = getAllPolls();
    const filtered = await filterAndSortPolls(polls);
    const list = document.getElementById('polls-list');
    if (!list) return;

    list.innerHTML = '';

    const countEl = document.getElementById('topbar-count');
    if (countEl) countEl.textContent = `${polls.length} poll${polls.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      let message = 'No polls yet';
      if (searchTerm) message = `No results for "${searchTerm}"`;
      else if (viewMode === 'myVotes') message = 'You haven\'t voted in any polls yet';
      
      list.innerHTML = `
        <div class="state-center" style="padding:48px 20px;">
          <div class="state-icon">🗳️</div>
          <p class="state-title">${message}</p>
          <p class="state-sub">Click "+ New Poll" to start your first battle!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => list.appendChild(renderPollCard(p)));
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initSearchAndView();
    refreshFeed();
    startRefresh(); // [변경] 30초 간격 시작
  });

  // [추가] 페이지 가시성 변경 감지
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stopRefresh(); // 탭이 안 보이면 중지
    } else {
      startRefresh(); // 다시 보이면 시작
      refreshFeed(); // 바로 새로고침
    }
  });

  window.refreshFeed = refreshFeed;

})();