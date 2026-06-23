let adminPw = '';
let allData = [];

function isSupabaseConfigured() {
  return window.CONFIG &&
    CONFIG.supabaseUrl &&
    !CONFIG.supabaseUrl.startsWith('YOUR_');
}

async function login() {
  const pw = document.getElementById('pwInput').value.trim();
  if (!pw) return;

  const correct = (window.CONFIG?.adminPassword) || 'jinju2024';
  if (pw !== correct) {
    document.getElementById('loginErr').style.display = 'block';
    return;
  }

  adminPw = pw;
  document.getElementById('loginErr').style.display = 'none';

  try {
    await loadSubmissions();
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('adminWrap').style.display = 'block';
  } catch (e) {
    alert('데이터를 불러오지 못했습니다.\n' + e.message);
  }
}

async function loadSubmissions() {
  if (isSupabaseConfigured()) {
    const res = await fetch(
      `${CONFIG.supabaseUrl}/rest/v1/submissions?select=*&order=submitted_at.desc`,
      {
        headers: {
          'apikey': CONFIG.supabaseKey,
          'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase 오류: ${res.status}`);
    const rows = await res.json();
    allData = rows.map(r => ({
      id: String(r.id),
      submittedAt: r.submitted_at,
      data: r.data || {},
    }));
  } else {
    const res = await fetch('/api/submissions', {
      headers: { 'x-admin-password': adminPw },
    });
    if (!res.ok) throw new Error('서버 연결 실패');
    allData = await res.json();
  }

  renderStats();
  renderTable();
}

function renderStats() {
  document.getElementById('statTotal').textContent = allData.length;

  const today = new Date().toISOString().split('T')[0];
  const todayCount = allData.filter(s => (s.submittedAt || '').startsWith(today)).length;
  document.getElementById('statToday').textContent = todayCount;

  const depts = new Set(allData.map(s => s.data?.dept).filter(Boolean));
  document.getElementById('statDepts').textContent = depts.size;
  document.getElementById('adminInfo').textContent = `총 ${allData.length}명 제출`;
}

function renderTable() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allData.filter(s => {
    const d = s.data || {};
    return !q ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.studentId || '').toLowerCase().includes(q) ||
      (d.dept || '').toLowerCase().includes(q);
  });

  const wrap = document.getElementById('tableWrap');

  if (filtered.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>${allData.length === 0 ? '아직 제출된 워크시트가 없습니다.' : '검색 결과가 없습니다.'}</p>
      </div>`;
    return;
  }

  const rows = filtered.map(s => {
    const d = s.data || {};
    const dt = new Date(s.submittedAt);
    const dateStr = dt.toLocaleDateString('ko-KR') + ' ' + dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return `
      <tr onclick="showDetail('${s.id}')">
        <td>${d.dept ? `<span class="badge-dept">${d.dept}</span>` : '-'}</td>
        <td><strong>${d.name || '-'}</strong></td>
        <td>${d.studentId || '-'}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.top_idea || '-'}</td>
        <td>${dateStr}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn-del" onclick="deleteEntry('${s.id}')">삭제</button>
        </td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="submissions-table">
      <thead>
        <tr>
          <th>학과</th><th>이름</th><th>학번</th><th>TOP 1 아이디어</th><th>제출 시각</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function showDetail(id) {
  const entry = allData.find(s => s.id === id);
  if (!entry) return;
  const d = entry.data || {};

  const section = (title, fields) => {
    const rows = fields.map(([key, label]) => {
      const val = d[key];
      if (val === undefined || val === null || val === '') return '';
      if (typeof val === 'boolean') return val ? `<div class="detail-row"><span class="detail-key">${label}</span><span class="detail-val">✓</span></div>` : '';
      return `<div class="detail-row"><span class="detail-key">${label}</span><span class="detail-val">${String(val).replace(/</g, '&lt;')}</span></div>`;
    }).join('');
    if (!rows) return '';
    return `<div class="detail-section"><div class="detail-section-title">${title}</div>${rows}</div>`;
  };

  const dt = new Date(entry.submittedAt);
  const dateStr = dt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('ko-KR');

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-title">${d.name || '이름 없음'} — ${d.dept || ''} ${d.studentId || ''}</div>
    <p style="font-size:12px;color:#aaa;margin-bottom:20px">제출: ${dateStr}</p>

    ${section('표지', [['dept','학과'],['studentId','학번'],['name','이름'],['date','날짜']])}
    ${section('PART 1 — 나를 발견하는 3가지 질문', [
      ['like1','좋아하는 것 1'],['like2','좋아하는 것 2'],['like3','좋아하는 것 3'],
      ['skill1','잘하는 것 1'],['skill2','잘하는 것 2'],['skill3','잘하는 것 3'],
      ['annoy1','불편했던 것 1'],['annoy2','불편했던 것 2'],['annoy3','불편했던 것 3'],
    ])}
    ${section('PART 1 — 교차점 & 원라이너', [
      ['kw1','창업 키워드 1'],['kw2','창업 키워드 2'],['kw3','창업 키워드 3'],
      ['ol_target','원라이너: 대상'],['ol_pain','원라이너: 불편함'],
      ['ol_solution','원라이너: 해결책'],['ol_service','원라이너: 서비스'],
    ])}
    ${section('PART 1 — Pain Point & 5 Whys', [
      ['pp1','Pain Point 1'],['pp2','Pain Point 2'],['pp3','Pain Point 3'],
      ['why_q1','표면적 불편함'],['why1','왜 1'],['why2','왜 2'],['why3','왜 3'],['why4','왜 4'],
      ['why_context','언제/어디서/무엇이'],
    ])}
    ${section('PART 1 — 창업 퍼즐', [
      ['puzzle_people_have','사람: 내가 가진 것'],['puzzle_people_lack','사람: 부족한 것'],
      ['puzzle_effort_have','노력: 내가 가진 것'],['puzzle_effort_lack','노력: 부족한 것'],
      ['puzzle_skill_have','능력: 내가 가진 것'],['puzzle_skill_lack','능력: 부족한 것'],
      ['puzzle_luck_have','운: 내가 가진 것'],['puzzle_luck_lack','운: 부족한 것'],
    ])}
    ${section('PART 2 — 마인드', [
      ['resolve1','각오: 쉽지 않아도'],['resolve2','각오: 주말 없어도'],
      ['resolve3','각오: 월급 늦어도'],['resolve4','각오: 실패해도 다시'],['resolve5','각오: 함께 성장'],
      ...Array.from({length:12},(_,i)=>[`mind_q${i+1}`,`마인드 Q${i+1}`]),
    ])}
    ${section('PART 2 — 아이디어', [
      ['major_dept','전공'],['major_skills','배운 스킬'],['major_idea','창업 아이디어'],
      ['idea1_name','아이디어 1'],['idea1_desc','설명 1'],
      ['idea2_name','아이디어 2'],['idea2_desc','설명 2'],
      ['idea3_name','아이디어 3'],['idea3_desc','설명 3'],
      ['idea4_name','아이디어 4'],['idea4_desc','설명 4'],
      ['idea5_name','아이디어 5'],['idea5_desc','설명 5'],
      ['top_idea','TOP 1 아이디어'],['mvp_essential','MVP 필수'],['mvp_exclude','MVP 제외'],
    ])}
    ${section('PART 3 — 비즈니스 모델', [
      ['bmc_cs','고객(CS)'],['bmc_vp','가치제안(VP)'],['bmc_channels','채널'],
      ['bmc_cr','고객관계'],['bmc_revenue','수익'],['bmc_resources','핵심자원'],
      ['bmc_activities','핵심활동'],['bmc_partners','파트너십'],['bmc_cost','비용구조'],
      ['value_subject','가치제안 대상'],['value_value','가치제안 내용'],
    ])}
    ${section('PART 3 — SNS', [
      ['sns_id','SNS 계정'],['sns_keywords','핵심 키워드'],
      ['content1','콘텐츠 1'],['content2','콘텐츠 2'],['content3','콘텐츠 3'],
      ['cal_why','왜'],['cal_who','누구에게'],['cal_how','어떻게'],['cal_what','무엇을'],
      ['insta_kw','인스타 키워드'],['insta_content','인스타 콘텐츠'],['insta_audience','인스타 대상'],
    ])}
    ${section('PART 4 — 로드맵 & 피칭', [
      ['stage','현재 단계'],
      ['tl_week','이번주'],['tl_month1','1달후'],['tl_month3','3달후'],
      ['tl_year1','1년후'],['tl_year3','3년후'],
      ['daejim_3yr','오늘의 다짐'],
      ['pitch_hook','Hook'],['pitch_problem','Problem'],
      ['pitch_solution','Solution'],['pitch_diff','Differentiator'],['pitch_ask','Ask'],
    ])}

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;text-align:right">
      <button class="btn-del" onclick="deleteEntry('${entry.id}');closeModal()" style="font-size:14px;padding:8px 16px">이 제출 삭제</button>
    </div>
  `;

  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').style.display = 'none';
  }
}

async function deleteEntry(id) {
  if (!confirm('이 제출을 삭제하시겠습니까?')) return;

  try {
    if (isSupabaseConfigured()) {
      await fetch(`${CONFIG.supabaseUrl}/rest/v1/submissions?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': CONFIG.supabaseKey,
          'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        },
      });
    } else {
      await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPw },
      });
    }
    allData = allData.filter(s => s.id !== id);
    renderStats();
    renderTable();
  } catch {
    alert('삭제에 실패했습니다.');
  }
}

function exportCSV() {
  if (!allData.length) { alert('내보낼 데이터가 없습니다.'); return; }

  const keys = [
    'dept','studentId','name','date',
    'like1','like2','like3','skill1','skill2','skill3','annoy1','annoy2','annoy3',
    'kw1','kw2','kw3','ol_target','ol_pain','ol_solution','ol_service',
    'pp1','pp2','pp3','why_q1','why1','why2','why3','why4','why_context',
    'top_idea','mvp_essential','mvp_exclude',
    'bmc_cs','bmc_vp','bmc_channels','bmc_cr','bmc_revenue',
    'bmc_resources','bmc_activities','bmc_partners','bmc_cost',
    'value_subject','value_value',
    'sns_id','sns_keywords','content1','content2','content3',
    'cal_why','cal_who','cal_how','cal_what','insta_kw','insta_content','insta_audience',
    'stage','tl_week','tl_month1','tl_month3','tl_year1','tl_year3',
    'daejim_3yr','pitch_hook','pitch_problem','pitch_solution','pitch_diff','pitch_ask',
  ];
  const labels = [
    '학과','학번','이름','날짜',
    '좋아하는것1','좋아하는것2','좋아하는것3','잘하는것1','잘하는것2','잘하는것3','불편했던것1','불편했던것2','불편했던것3',
    '창업키워드1','창업키워드2','창업키워드3','원라이너_대상','원라이너_불편함','원라이너_해결책','원라이너_서비스',
    'PP1','PP2','PP3','표면적불편함','왜1','왜2','왜3','왜4','상황설명',
    'TOP1','MVP필수','MVP제외',
    'CS','VP','채널','고객관계','수익','핵심자원','핵심활동','파트너십','비용구조',
    '가치제안_대상','가치제안_내용',
    'SNS아이디','핵심키워드','콘텐츠1','콘텐츠2','콘텐츠3',
    '왜','누구에게','어떻게','무엇을','인스타키워드','인스타콘텐츠','인스타대상',
    '현재단계','이번주','1달후','3달후','1년후','3년후',
    '오늘의다짐','Hook','Problem','Solution','Differentiator','Ask',
  ];

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['제출시각', ...labels].map(esc).join(',');
  const rows = allData.map(s => {
    const d = s.data || {};
    return [new Date(s.submittedAt).toLocaleString('ko-KR'), ...keys.map(k => d[k] ?? '')].map(esc).join(',');
  });

  const csv = '﻿' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `창업워크시트_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}
