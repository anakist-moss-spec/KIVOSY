// create.js — Poll creation logic
// Handles the create modal, form submission, link generation

(function () {
  'use strict';

  const API_URL = 'https://kivosy-api.anakist-y.workers.dev';

  // ── Helpers ───────────────────────────────────────────────────────────────

  function generateId() {
    return Math.random().toString(36).slice(2, 6) +
           Math.random().toString(36).slice(2, 6);
  }

  function buildVoteUrl(pollId) {
    const base = window.location.href
      .replace(/index\.html.*$/, '')
      .replace(/\/$/, '');
    return `${base}/vote.html?pollId=${pollId}`;
  }

  function buildDashUrl(pollId) {
    const base = window.location.href
      .replace(/index\.html.*$/, '')
      .replace(/\/$/, '');
    return `${base}/dashboard.html?pollId=${pollId}`;
  }

  async function savePoll(poll) {
    try {
      const response = await fetch(`${API_URL}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poll)
      });

      if (!response.ok) throw new Error('서버 저장 실패');

      const polls = JSON.parse(localStorage.getItem('vv_polls') || '[]');
      if (!polls.find(p => p.id === poll.id)) polls.unshift(poll);
      localStorage.setItem('vv_polls', JSON.stringify(polls));
      
      console.log("서버에 투표 생성 완료:", poll.id);
    } catch (err) {
      console.error("서버 저장 중 오류 발생:", err);
      alert("서버 연결에 실패했습니다. 하지만 로컬에는 저장됩니다.");
    }
  }

  // [추가] 데모 votes를 서버에 저장하는 함수
  async function saveDemoVotes(pollId, votes) {
    try {
      const response = await fetch(`${API_URL}/api/demo-votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, votes })
      });
      
      if (!response.ok) throw new Error('데모 votes 저장 실패');
      console.log(`데모 votes 저장 완료: ${pollId}`);
    } catch (err) {
      console.error("데모 votes 저장 실패:", err);
    }
  }

  function showToast(msg, duration = 2000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), duration);
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function openModal() {
    document.getElementById('create-modal').classList.add('open');
    document.getElementById('create-result').style.display = 'none';
    document.getElementById('create-form').style.display = '';
    document.getElementById('create-form').reset();
    setTimeout(() => document.getElementById('cf-title')?.focus(), 80);
  }

  function closeModal() {
    document.getElementById('create-modal').classList.remove('open');
  }

  async function handleCreate(title, optA, optB, category) {
    const poll = {
      id:        generateId(),
      title:     title.trim(),
      optionA:   optA.trim(),
      optionB:   optB.trim(),
      category:  category || 'general',
      createdAt: new Date().toISOString(),
    };

    await savePoll(poll);

    const voteUrl = buildVoteUrl(poll.id);
    const dashUrl = buildDashUrl(poll.id);

    document.getElementById('create-form').style.display = 'none';
    document.getElementById('create-result').style.display = '';
    document.getElementById('result-url').textContent = voteUrl;
    document.getElementById('result-vote-link').href = voteUrl;
    document.getElementById('result-dash-link').href = dashUrl;

    if (typeof window.refreshFeed === 'function') window.refreshFeed();

    return poll;
  }

  function handleQuickCreate(raw) {
    const parts = raw.split('/').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      showToast('Format: "Question / Option A / Option B"');
      return;
    }
    const [title, optA, optB] = parts;
    handleCreate(title, optA, optB, 'general');
    openModal();
  }

  async function loadDemoData() {
    const demoPolls = [
      {
        id: 'demo01',
        title: 'Kyochon vs BHC — Who has the best fried chicken?',
        optionA: 'Kyochon',
        optionB: 'BHC',
        category: 'food',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'demo02',
        title: '손흥민 vs 이강인 — 한국 최고의 선수는?',
        optionA: '손흥민',
        optionB: '이강인',
        category: 'sports',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'demo03',
        title: 'ChatGPT vs Claude — Best AI?',
        optionA: 'ChatGPT',
        optionB: 'Claude',
        category: 'tech',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];

    const demo01Votes = [
      { pollId:'demo01', choice:'Kyochon', source:{ type:'web', domain:'chat.deepseek.com', displayName:'🤖 DeepSeek', fullUrl:'https://chat.deepseek.com/', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo01', choice:'BHC',     source:{ type:'web', domain:'twitter.com', displayName:'🐦 X/Twitter', fullUrl:'https://twitter.com', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo01', choice:'Kyochon', source:{ type:'web', domain:'twitter.com', displayName:'🐦 X/Twitter', fullUrl:'https://twitter.com', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo01', choice:'BHC',     source:{ type:'web', domain:'fmkorea.com', displayName:'🏆 FMKorea', fullUrl:'https://fmkorea.com', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo01', choice:'Kyochon', source:{ type:'direct', domain:'direct', displayName:'🔗 Direct', fullUrl: null, path: null }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo01', choice:'Kyochon', source:{ type:'web', domain:'cafe.naver.com', displayName:'🌐 Naver Cafe', fullUrl:'https://cafe.naver.com', path:'/chicken' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo01', choice:'BHC',     source:{ type:'web', domain:'reddit.com', displayName:'👽 Reddit', fullUrl:'https://reddit.com/r/korea', path:'/r/korea' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
    ];

    const demo02Votes = [
      { pollId:'demo02', choice:'손흥민', source:{ type:'web', domain:'theqoo.net', displayName:'🌸 Theqoo', fullUrl:'https://theqoo.net', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo02', choice:'이강인', source:{ type:'web', domain:'dcinside.com', displayName:'🎮 DCInside', fullUrl:'https://dcinside.com', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo02', choice:'손흥민', source:{ type:'direct', domain:'direct', displayName:'🔗 Direct', fullUrl: null, path: null }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
    ];

    const demo03Votes = [
      { pollId:'demo03', choice:'Claude', source:{ type:'web', domain:'news.ycombinator.com', displayName:'🟠 Hacker News', fullUrl:'https://news.ycombinator.com', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo03', choice:'ChatGPT', source:{ type:'web', domain:'reddit.com', displayName:'👽 Reddit', fullUrl:'https://reddit.com', path:'/' }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
      { pollId:'demo03', choice:'Claude', source:{ type:'direct', domain:'direct', displayName:'🔗 Direct', fullUrl: null, path: null }, timestamp: new Date().toISOString(), userAgent: 'Mozilla/5.0' },
    ];

    // 1. 투표 데이터 저장 (polls)
    for (const poll of demoPolls) {
      await savePoll(poll);
    }
    
    // 2. votes 데이터 저장 (서버)
    await saveDemoVotes('demo01', demo01Votes);
    await saveDemoVotes('demo02', demo02Votes);
    await saveDemoVotes('demo03', demo03Votes);
    
    // 3. 로컬에도 저장 (백업)
    localStorage.setItem('vv_votes_demo01', JSON.stringify(demo01Votes));
    localStorage.setItem('vv_votes_demo02', JSON.stringify(demo02Votes));
    localStorage.setItem('vv_votes_demo03', JSON.stringify(demo03Votes));

    if (typeof window.refreshFeed === 'function') window.refreshFeed();
    showToast('Demo data loaded! ✅');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-open-create')?.addEventListener('click', openModal);
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('create-modal')?.addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    document.getElementById('create-form')?.addEventListener('submit', function (e) {
      e.preventDefault();
      const title = document.getElementById('cf-title').value;
      const optA  = document.getElementById('cf-optA').value;
      const optB  = document.getElementById('cf-optB').value;
      const cat   = document.getElementById('cf-cat').value;
      if (!title || !optA || !optB) return;
      handleCreate(title, optA, optB, cat);
    });

    document.getElementById('btn-copy-result')?.addEventListener('click', function () {
      const url = document.getElementById('result-url').textContent;
      copyText(url).then(() => {
        this.textContent = '✓ Copied';
        this.classList.add('copied');
        setTimeout(() => { this.textContent = 'Copy'; this.classList.remove('copied'); }, 2000);
      });
    });

    const promptInput = document.getElementById('prompt-input');
    const sendBtn     = document.getElementById('send-btn');

    function tryQuickCreate() {
      const raw = promptInput.value.trim();
      if (!raw) { openModal(); return; }
      handleQuickCreate(raw);
      promptInput.value = '';
    }

    sendBtn?.addEventListener('click', tryQuickCreate);
    promptInput?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        tryQuickCreate();
      }
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    document.getElementById('btn-load-demo')?.addEventListener('click', loadDemoData);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  });

  window.VVCreate = { openModal, closeModal, buildVoteUrl, buildDashUrl };

})();