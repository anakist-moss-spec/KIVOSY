/**
 * VibeVote — Cloudflare Worker: Dynamic OG Image Generator
 * Route: /api/og/:pollId.png
 * 무료 버전: D1 + SVG 직접 반환 (Browser Rendering 불필요)
 */

// ============================================================
// 1. 당신의 완전한 HTML 템플릿 (그대로 유지)
// ============================================================
function buildHtml({ poll, total, aPct, bPct, winner, topSources }) {
  const aBarW = Math.max(4, aPct);
  const bBarW = Math.max(4, bPct);

  const fmtNum = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const titleSafe = esc(poll.title);
  const optA = esc(poll.optionA);
  const optB = esc(poll.optionB);

  // Source rows HTML
  const sourceRows = topSources.map(([, data]) => {
    const t = data.a + data.b;
    const pa = t > 0 ? Math.round((data.a / t) * 100) : 50;
    const pb = 100 - pa;
    return `
      <div class="src-row">
        <span class="src-name">${esc(data.displayName)}</span>
        <div class="src-bar-track">
          <div class="src-bar-a" style="width:${pa}%"></div>
          <div class="src-bar-b" style="width:${pb}%"></div>
        </div>
        <span class="src-a">${pa}%</span>
        <span class="src-sep">·</span>
        <span class="src-b">${pb}%</span>
      </div>
    `;
  }).join('');

  const winnerHtml = winner
    ? `<div class="winner">🏆 Leading: <strong>${esc(winner)}</strong> (${Math.max(aPct, bPct)}%)</div>`
    : `<div class="winner">🤝 It's a tie!</div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px;
    overflow: hidden;
    background: #F5F5F7;
    font-family: -apple-system, 'Inter', BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: stretch;
  }
  .card {
    flex: 1;
    background: #fff;
    border-radius: 24px;
    margin: 28px;
    padding: 44px 52px;
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 40px rgba(0,0,0,0.10);
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, #0071E3, #34AADC);
    border-radius: 24px 24px 0 0;
  }
  .logo {
    font-size: 15px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #86868B; margin-bottom: 18px;
  }
  .logo em { color: #0071E3; font-style: normal; }
  .title {
    font-size: 38px; font-weight: 800; color: #1D1D1F;
    line-height: 1.15; letter-spacing: -0.02em;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    font-size: 17px; color: #86868B; margin-bottom: 20px;
    font-weight: 500;
  }
  .bar-labels {
    display: flex; justify-content: space-between;
    margin-bottom: 8px;
  }
  .opt-a-label { font-size: 22px; font-weight: 700; color: #0071E3; }
  .opt-b-label { font-size: 22px; font-weight: 700; color: #FF3B30; }
  .pct-a { font-size: 22px; font-weight: 800; color: #0071E3; }
  .pct-b { font-size: 22px; font-weight: 800; color: #FF3B30; }
  .bar-track {
    height: 20px; background: #E5E5EA;
    border-radius: 10px; overflow: hidden;
    display: flex; margin-bottom: 16px;
  }
  .bar-a { background: #0071E3; height: 100%; width: ${aBarW}%; border-radius: 10px 0 0 10px; }
  .bar-b { background: #FF3B30; height: 100%; width: ${bBarW}%; border-radius: 0 10px 10px 0; }
  .winner {
    font-size: 16px; color: #3A3A3C;
    margin-bottom: 16px;
    background: #F5F5F7;
    padding: 8px 14px;
    border-radius: 8px;
    display: inline-block;
    font-weight: 500;
  }
  .winner strong { color: #0071E3; }
  .sources-label {
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #86868B; margin-bottom: 8px;
  }
  .src-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 7px;
  }
  .src-name { width: 160px; font-size: 14px; font-weight: 600; color: #1D1D1F; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .src-bar-track { flex: 1; height: 6px; background: #E5E5EA; border-radius: 3px; overflow: hidden; display: flex; }
  .src-bar-a { background: #0071E3; height: 100%; }
  .src-bar-b { background: #FF3B30; height: 100%; }
  .src-a { font-size: 13px; font-weight: 700; color: #0071E3; width: 34px; text-align: right; flex-shrink: 0; }
  .src-sep { color: #C7C7CC; font-size: 13px; }
  .src-b { font-size: 13px; font-weight: 700; color: #FF3B30; width: 34px; flex-shrink: 0; }
  .footer {
    margin-top: auto; padding-top: 12px;
    font-size: 14px; color: #C7C7CC; font-weight: 500;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
<div class="card">
  <div class="logo">Vibe<em>Vote</em></div>
  <div class="title">${titleSafe}</div>
  <div class="meta">${fmtNum(total)} vote${total !== 1 ? 's' : ''} · ${topSources.length} platform${topSources.length !== 1 ? 's' : ''}</div>

  <div class="bar-labels">
    <span><span class="opt-a-label">${optA}</span> &nbsp;<span class="pct-a">${aPct}%</span></span>
    <span><span class="pct-b">${bPct}%</span> &nbsp;<span class="opt-b-label">${optB}</span></span>
  </div>
  <div class="bar-track">
    <div class="bar-a"></div>
    <div class="bar-b"></div>
  </div>

  ${winnerHtml}

  ${topSources.length > 0 ? `
    <div class="sources-label">By Platform</div>
    ${sourceRows}
  ` : ''}

  <div class="footer">kivosy.com · Vote and see where each community stands</div>
</div>
</body>
</html>`;
}

// Minimal HTML escaper
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTML을 SVG로 감싸는 함수
function htmlToSvg(html) {
  // HTML 특수문자 처리
  const escapedHtml = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="1200" height="630">
    <div xmlns="http://www.w3.org/1999/xhtml">
      ${escapedHtml}
    </div>
  </foreignObject>
</svg>`;
}

// ============================================================
// 2. 메인 Worker 로직 (D1 연결)
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/og\/([^/]+)\.png$/i);
    
    if (!match) {
      return new Response('Not found', { status: 404 });
    }
    
    const pollId = match[1];
    
    try {
      // D1에서 투표 정보 조회
      const poll = await env.DB.prepare(
        'SELECT * FROM polls WHERE id = ?'
      ).bind(pollId).first();
      
      if (!poll) {
        return Response.redirect('https://kivosy.com/og-default.png', 302);
      }
      
      // D1에서 투표 데이터 조회
      const votes = await env.DB.prepare(
        `SELECT choice, source_domain, source_display, COUNT(*) as count 
         FROM votes WHERE poll_id = ? 
         GROUP BY choice, source_domain`
      ).bind(pollId).all();
      
      // 통계 계산
      const aTotal = votes.results
        .filter(v => v.choice === poll.optionA)
        .reduce((sum, v) => sum + v.count, 0);
      const bTotal = votes.results
        .filter(v => v.choice === poll.optionB)
        .reduce((sum, v) => sum + v.count, 0);
      const total = aTotal + bTotal;
      const aPct = total > 0 ? Math.round((aTotal / total) * 100) : 50;
      const bPct = 100 - aPct;
      
      // 소스별 통계
      const sourceMap = new Map();
      votes.results.forEach(v => {
        const domain = v.source_domain || 'direct';
        const dn = v.source_display || domain;
        if (!sourceMap.has(domain)) {
          sourceMap.set(domain, { displayName: dn, a: 0, b: 0 });
        }
        const e = sourceMap.get(domain);
        if (v.choice === poll.optionA) e.a = v.count;
        else e.b = v.count;
      });
      
      const topSources = [...sourceMap.entries()]
        .sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b))
        .slice(0, 4);
      
      // 당신의 HTML 템플릿 사용
      const html = buildHtml({ 
        poll, 
        total, 
        aPct, 
        bPct, 
        winner: aPct > bPct ? poll.optionA : bPct > aPct ? poll.optionB : null,
        topSources 
      });
      
      // SVG로 변환
      const svg = htmlToSvg(html);
      
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, s-maxage=60, max-age=30',
        },
      });
      
    } catch (err) {
      console.error('OG image error:', err);
      return Response.redirect('https://kivosy.com/og-default.png', 302);
    }
  },
};