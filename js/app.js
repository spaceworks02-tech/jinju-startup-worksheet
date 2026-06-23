const TOTAL = 15;

const LABELS = [
  '표지',
  'PART 1 · 나를 발견하는 3가지 질문',
  'PART 1 · 교차점 & 원라이너',
  'PART 1 · Pain Point 헌팅',
  'PART 1 · 5 Whys 기법',
  'PART 1 · 창업 퍼즐 (자산 점검)',
  'PART 2 · 창업 각오 체크리스트',
  'PART 2 · 창업가 마인드 자가 진단',
  'PART 2 · 전공 기반 창업 & 아이디어',
  'PART 2 · 아이디어 매트릭스 & MVP',
  'PART 3 · 비즈니스 모델 캔버스',
  'PART 3 · 핵심 가치 제안 & SNS 명함',
  'PART 4 · 현재 단계 & 타임라인',
  'PART 4 · 오늘의 다짐 & 1분 피칭',
  'PART 4 · 자기 평가 & 제출',
];

let current = 0;
let saveTimer = null;

// ── Navigation ──────────────────────────────────────────

function showStep(n) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.querySelector(`.step[data-step="${n}"]`).classList.add('active');
  document.getElementById('stepsContainer').scrollTop = 0;
  current = n;
  updateUI();
}

function nextStep() {
  if (current < TOTAL - 1) { save(); showStep(current + 1); }
}

function prevStep() {
  if (current > 0) { save(); showStep(current - 1); }
}

function updateUI() {
  const pct = (current / (TOTAL - 1)) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('stepLabelText').textContent = LABELS[current];
  document.getElementById('stepCounter').textContent = `${current + 1} / ${TOTAL}`;
  document.getElementById('btnPrev').disabled = current === 0;
  const next = document.getElementById('btnNext');
  next.style.display = current === TOTAL - 1 ? 'none' : '';
}

// ── Data collection / save ──────────────────────────────

function collectData() {
  const data = {};
  document.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') data[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
    else data[el.name] = el.value;
  });
  document.querySelectorAll('.rating-btn.sel').forEach(btn => {
    data[btn.dataset.name] = parseInt(btn.dataset.value);
  });
  return data;
}

function save() {
  const data = collectData();
  try {
    localStorage.setItem('jinju_ws', JSON.stringify(data));
    showSave('저장됨 ✓', true);
  } catch {
    showSave('저장 실패', false);
  }
}

function showSave(msg, ok) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-status' + (ok ? ' saved' : '');
  setTimeout(() => { el.textContent = ''; el.className = 'save-status'; }, 2000);
}

function loadData() {
  let data;
  try { data = JSON.parse(localStorage.getItem('jinju_ws') || '{}'); }
  catch { return; }

  Object.entries(data).forEach(([key, val]) => {
    const els = document.querySelectorAll(`[name="${key}"]`);
    els.forEach(el => {
      if (el.type === 'checkbox') {
        el.checked = val;
        const item = el.closest('.check-item');
        if (item && val) item.classList.add('checked');
        const evalItem = el.closest('.eval-item');
        if (evalItem && val) evalItem.classList.add('done');
      } else if (el.type === 'radio') {
        if (el.value === String(val)) {
          el.checked = true;
          const stage = el.closest('.stage-item');
          if (stage) stage.classList.add('sel');
        }
      } else {
        el.value = val;
      }
    });

    if (typeof key === 'string' && key.startsWith('mind_q')) {
      const btn = document.querySelector(`.rating-btn[data-name="${key}"][data-value="${val}"]`);
      if (btn) btn.classList.add('sel');
    }
  });

  updateScore();
}

// ── Auto-save ────────────────────────────────────────────

function setupAutoSave() {
  document.addEventListener('input', () => {
    clearTimeout(saveTimer);
    const el = document.getElementById('saveStatus');
    if (el) { el.textContent = '저장 중…'; el.className = 'save-status saving'; }
    saveTimer = setTimeout(save, 800);
  });
  document.addEventListener('change', save);
}

// ── Rating buttons ───────────────────────────────────────

function setupRatingBtns() {
  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      document.querySelectorAll(`.rating-btn[data-name="${name}"]`).forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      updateScore();
      save();
    });
  });
}

function updateScore() {
  let total = 0;
  for (let i = 1; i <= 12; i++) {
    const sel = document.querySelector(`.rating-btn[data-name="mind_q${i}"].sel`);
    if (sel) total += parseInt(sel.dataset.value);
  }
  const el = document.getElementById('mindScore');
  if (el) el.textContent = total;

  ['sb1', 'sb2', 'sb3'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  if (total >= 12 && total <= 30) document.getElementById('sb1')?.classList.add('active');
  else if (total >= 31 && total <= 48) document.getElementById('sb2')?.classList.add('active');
  else if (total >= 49) document.getElementById('sb3')?.classList.add('active');
}

// ── Checkbox helpers ─────────────────────────────────────

function toggleCheck(item) {
  const cb = item.querySelector('input[type="checkbox"]');
  if (!cb) return;
  cb.checked = !cb.checked;
  item.classList.toggle('checked', cb.checked);
  save();
}

function toggleEval(cb) {
  const item = cb.closest('.eval-item');
  if (item) item.classList.toggle('done', cb.checked);
}

// ── Stage selection ──────────────────────────────────────

function selectStage(item, val) {
  document.querySelectorAll('.stage-item').forEach(i => {
    i.classList.remove('sel');
    const r = i.querySelector('input[type="radio"]');
    if (r) r.checked = false;
  });
  item.classList.add('sel');
  const radio = item.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;
  save();
}

// ── Submit ───────────────────────────────────────────────

function isSupabaseConfigured() {
  return window.CONFIG &&
    CONFIG.supabaseUrl &&
    !CONFIG.supabaseUrl.startsWith('YOUR_');
}

async function submitWorksheet() {
  const data = collectData();

  if (!data.name || !data.dept || !data.studentId) {
    alert('표지 페이지에서 학과, 학번, 이름을 먼저 입력해 주세요.\n(← 이전 버튼으로 돌아가세요)');
    return;
  }

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.textContent = '제출 중…';

  try {
    let ok = false;

    if (isSupabaseConfigured()) {
      const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.supabaseKey,
          'Authorization': `Bearer ${CONFIG.supabaseKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          student_id: data.studentId || null,
          dept: data.dept || null,
          name: data.name || null,
          data: data,
        }),
      });
      ok = res.ok;
      if (!ok) {
        const err = await res.text();
        console.error('Supabase error:', err);
      }
    } else {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      ok = res.ok;
    }

    if (ok) {
      localStorage.removeItem('jinju_ws');
      showSuccess();
    } else {
      throw new Error('submit failed');
    }
  } catch (e) {
    console.error(e);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safe = (data.studentId || 'unknown').replace(/[^a-zA-Z0-9가-힣]/g, '');
    a.download = `워크시트_${data.name || '무명'}_${safe}.json`;
    a.click();
    alert('제출에 실패하여 파일로 저장했습니다.\n파일을 선생님께 전달해 주세요.');
  }

  btn.disabled = false;
  btn.textContent = '워크시트 제출하기 ✓';
}

function showSuccess() {
  document.getElementById('submitSection').style.display = 'none';
  document.getElementById('successSection').style.display = 'block';
  document.getElementById('btnNext').style.display = 'none';
}

// ── Init ─────────────────────────────────────────────────

function init() {
  const dateField = document.querySelector('[name="date"]');
  if (dateField && !dateField.value) {
    dateField.value = new Date().toISOString().split('T')[0];
  }

  setupRatingBtns();
  setupAutoSave();
  loadData();
  showStep(0);
}

document.addEventListener('DOMContentLoaded', init);
