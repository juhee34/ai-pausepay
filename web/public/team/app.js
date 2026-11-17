import { handbook as h } from './content.js';

const KEY = 'unis.team-handbook.checks.v1'; // 학생 데이터가 아닌 팀 문서 전용 기록. 아래 별도 파일로 이동합니다.
const main = document.querySelector('#main');
const toc = document.querySelector('#toc');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = Object.fromEntries(h.tasks.map(t => [t.id, t.done]));
let storageAvailable = true;
let filters = { query: '', owner: 'all', status: 'all' };
let currentView = '';
let messageTimer;

function notify(text) {
  const box = document.querySelector('#message');
  box.textContent = text;
  box.classList.add('visible');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => box.classList.remove('visible'), 6000);
}

function validate(file) {
  if (!file || file.app !== 'unis-team-handbook' || file.version !== 1 || !file.checks || typeof file.checks !== 'object' || Array.isArray(file.checks)) throw new Error('우니스 팀 문서 체크 파일인지 확인해 주세요.');
  const checks = Object.entries(file.checks);
  const known = new Set(h.tasks.map(t => t.id));
  if (!checks.length || checks.some(([id, value]) => !known.has(id) || typeof value !== 'boolean')) throw new Error('체크 항목이나 파일 형식이 맞지 않아요.');
  return Object.fromEntries(checks);
}

try {
  const saved = localStorage.getItem(KEY);
  if (saved) state = { ...state, ...validate(JSON.parse(saved)) };
} catch {
  storageAvailable = false;
  notify('저장된 체크를 읽지 못했어요. 초기 상태로 표시합니다. 체크 파일로 기록을 보관해 주세요.');
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ app: 'unis-team-handbook', version: 1, checks: state }));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    notify('브라우저에 저장하지 못했어요. 화면의 체크는 유지됩니다. 파일로 내보내 주세요.');
  }
  updateStats();
}

const activeTasks = h.tasks.filter(t => t.phase !== 'later');
function stats() {
  const done = activeTasks.filter(t => state[t.id]).length;
  return { done, total: activeTasks.length, percent: Math.round(done / activeTasks.length * 100) };
}

function heading(kicker, title, text) {
  return `<div class="page-heading"><div class="breadcrumb">UNIS HANDBOOK <span>/</span> ${kicker}</div><h1>${title}</h1><p>${text}</p><div class="meta"><span>2026.11.04 업데이트</span><span>main · ${h.commit}</span><span>2인 팀 · 광운대 시범 운영</span></div></div>`;
}

function sectionMarkup(section, i) {
  return `<section id="${section.id}" class="doc-section"><div class="section-heading"><span class="section-no">${String(i+1).padStart(2,'0')}</span><h2>${escape(section.title)}</h2></div>${section.lead ? `<p class="section-lead">${escape(section.lead)}</p>` : ''}<div class="${section.blocks.length === 2 ? 'blocks two' : 'blocks'}">${section.blocks.map(b => `<article class="content-block"><h3>${escape(b.title)}</h3><p>${escape(b.body)}</p>${b.route ? `<a class="text-link" href="${escape(b.route)}">화면 열기 <span aria-hidden="true">↗</span></a>` : ''}</article>`).join('')}</div></section>`;
}

function serviceHero() {
  return `<section class="hero" aria-label="우니스 한눈에"><div class="hero-copy"><p class="eyebrow">LESS SCATTERED. MORE CONNECTED.</p><h2>수업 일정과<br>취업 준비를<br><em>한곳에서.</em></h2><p>정리하고, 오늘 할 일을 고르고,<br>끝난 경험을 다음 기회로 이어 보세요.</p><a href="#roadmap" class="hero-link">우리가 만든 것 살펴보기 <span>↗</span></a></div><div class="hero-visual"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="mock-window"><div class="mock-top"><span>UNIS<span class="small-dot"></span></span><small>화면 구성 예시</small></div><p class="mock-date">NOVEMBER 2026</p><h3>오늘, 한 가지부터.</h3><div class="mock-task"><span>수업 · 경영통계</span><strong>기말고사 준비하기</strong><small>배점 30% · 예시 D-3 · 약 2시간</small><div class="mock-bar"><i></i></div></div><div class="mock-row"><span class="mock-symbol">↗</span><div>다음 기회도 놓치지 않게<small>취업 · 지원 마감도 같은 곳에</small></div></div><div class="mock-row"><span class="mock-symbol">✓</span><div>경험이 기록으로<small>끝난 활동은 스펙 영수증으로</small></div></div><p class="mock-caption">설명을 위한 예시이며 실제 개인 기록이 아닙니다.</p></div><span class="visual-note">YOUR DAYS, CONNECTED.</span></div></section><div class="principle-strip"><span><b>01</b> 흩어진 마감을 모으고</span><span><b>02</b> 오늘의 선택을 돕고</span><span><b>03</b> 경험을 기록으로</span></div>`;
}

function renderDocs(view) {
  const service = view === 'service';
  const sections = h[view];
  main.innerHTML = heading(service ? 'SERVICE' : 'DEVELOPMENT', service ? '우니스 서비스 소개서' : '함께 만드는 개발 가이드', service ? '흩어진 대학 생활을 하나로 잇는, 대학생 AI 비서.' : '처음 만드는 웹앱도, 다음 할 일이 보이면 차근차근 만들 수 있어요.')
    + (service ? serviceHero() : `<div class="guide-callout"><span class="eyebrow">WHERE WE ARE</span><h2>구현한 것에 체크하고,<br>폰에서 확인할 것은 남겨 두었어요.</h2><p>주요 기능은 구현되어 있습니다. 이제 실제 자료와 두 폰으로 검증하고, 시범 운영을 준비할 차례입니다.</p><a class="text-link" href="#roadmap">개발 순서 열기 →</a></div>`)
    + sections.map(sectionMarkup).join('')
    + `<div class="next-document"><span>다음 문서</span><a href="#${service ? 'guide' : 'roadmap'}">${service ? '우리 팀 개발 가이드' : '직접 체크하는 개발 순서'} <b>→</b></a></div>`;
  toc.innerHTML = sections.map((s,i) => `<a href="#${view}/${s.id}"><span>${String(i+1).padStart(2,'0')}</span>${escape(s.title)}</a>`).join('');
}

function taskMarkup(t) {
  return `<article class="task ${state[t.id] ? 'done' : ''}"><label class="task-label"><input type="checkbox" data-task="${t.id}" ${state[t.id] ? 'checked' : ''}><span class="task-text"><strong>${escape(t.title)}</strong><span>${escape(t.acceptance)}</span></span></label><div class="task-bottom"><span class="owner">${escape(t.owner)}</span><details><summary>완료 근거 · 확인 기준</summary><p>${escape(t.evidence)}</p><p>11/4 초기 기록: ${t.phase === 'later' ? '후속 작업 보류' : t.done ? '구현 확인' : '완료 증빙 미확인'} · 현재 체크는 팀이 수정할 수 있습니다.</p></details></div></article>`;
}

function renderRoadmap() {
  main.innerHTML = heading('ROADMAP', '하나씩, 완료해 나가요.', '이미 만든 것에는 체크를, 아직 확인할 것에는 다음 행동을 남겼어요.')
    + `<div class="progress-panel"><div><span class="eyebrow">OUR NEXT MILESTONE</span><h2>11월 20일, 기능 동결</h2><p>초기 체크 = 구현 확인 · 폰 검증은 별도</p></div><div class="progress-numbers"><strong data-stat="done"></strong><span> / <span data-stat="total"></span>개 완료</span></div><div class="progress-track" role="progressbar" aria-label="개발 순서 완료율" aria-valuemin="0" aria-valuemax="100"><i></i></div><small><span data-stat="percent"></span>% · 미룬 일 제외 · 체크는 자유롭게 바꿀 수 있어요</small></div>`
    + `<div class="roadmap-tools"><label class="search-label"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="할 일이나 완료 근거 검색" aria-label="할 일 검색" value="${escape(filters.query)}"></label><div class="filter-row"><select id="owner" aria-label="담당자"><option value="all">모든 담당자</option value="A">A · juhee34</option><option value="B">B · jhk05love-debug</option></select><select id="status" aria-label="완료 상태"><option value="all">모든 상태</option><option value="pending">남은 일</option><option value="done">체크한 일</option></select><button id="export" class="secondary-button">체크 기록 내보내기 ↗</button><button id="import" class="secondary-button">가져오기</button><input type="file" id="import-file" accept=".json,application/json" hidden></div></div><p id="storage-note" class="storage-note"></p><p id="results" class="results" aria-live="polite"></p><div id="phases"></div>`;
  document.querySelector('#owner').value = filters.owner;
  document.querySelector('#status').value = filters.status;
  toc.innerHTML = h.phases.map((p,i) => `<a href="#roadmap/${p.id}"><span>${String(i+1).padStart(2,'0')}</span>${escape(p.title)}</a>`).join('');
  document.querySelector('#search').addEventListener('input', e => { filters.query = e.target.value; renderTasks(); });
  for (const key of ['owner', 'status']) document.querySelector(`#${key}`).addEventListener('change', e => { filters[key] = e.target.value; renderTasks(); });
  document.querySelector('#export').addEventListener('click', exportChecks);
  document.querySelector('#import').addEventListener('click', () => document.querySelector('#import-file').click());
  document.querySelector('#import-file').addEventListener('change', importChecks);
  renderTasks();
  updateStats();
}

function renderTasks() {
  const query = filters.query.trim().toLocaleLowerCase();
  const filtered = h.tasks.filter(t => (!query || `${t.title} ${t.evidence} ${t.acceptance}`.toLocaleLowerCase().includes(query)) && (filters.owner === 'all' || t.owner.includes(filters.owner)) && (filters.status === 'all' || (filters.status === 'done' ? state[t.id] : !state[t.id])));
  document.querySelector('#results').textContent = `${filtered.length}개 항목 표시 · 전체 완료율은 검색·필터와 관계없이 계산합니다.`;
  document.querySelector('#phases').innerHTML = filtered.length ? h.phases.map((p,i) => {
    const tasks = filtered.filter(t => t.phase === p.id);
    if (!tasks.length) return '';
    const all = h.tasks.filter(t => t.phase === p.id);
    return `<section class="phase" id="${p.id}"><div class="phase-header"><span class="phase-number">${String(i+1).padStart(2,'0')}</span><div><p class="eyebrow">${escape(p.when)}</p><h2>${escape(p.title)}</h2><p>${escape(p.description)}</p></div><span class="phase-count">${p.id === 'later' ? '보류' : `${all.filter(t => state[t.id]).length} / ${all.length}`}</span></div><div class="tasks">${tasks.map(taskMarkup).join('')}</div></section>`;
  }).join('') : `<div class="empty"><h2>조건에 맞는 할 일이 없어요.</h2><p>검색어나 담당자·상태를 바꿔 보세요.</p><button id="clear-filter" class="secondary-button">필터 초기화</button></div>`;
  document.querySelector('#clear-filter')?.addEventListener('click', () => { filters = {query:'',owner:'all',status:'all'}; renderRoadmap(); });
  for (const checkbox of document.querySelectorAll('[data-task]')) checkbox.addEventListener('change', e => {
    const id = e.target.dataset.task;
    state[id] = e.target.checked;
    e.target.closest('.task').classList.toggle('done', state[id]);
    persist();
    // 전체 목록에서는 키보드 포커스를 유지합니다. 상태 필터 중에만 목록을 다시 만듭니다.
    if (filters.status !== 'all') renderTasks();
    else for (const phase of document.querySelectorAll('.phase')) {
      if (phase.id === 'later') continue;
      const tasks = h.tasks.filter(t => t.phase === phase.id);
      phase.querySelector('.phase-count').textContent = `${tasks.filter(t => state[t.id]).length} / ${tasks.length}`;
    }
  });
}

function updateStats() {
  const s = stats();
  for (const key of ['done','total','percent']) for (const el of document.querySelectorAll(`[data-stat="${key}"]`)) el.textContent = s[key];
  const progress = document.querySelector('.progress-track');
  if (progress) { progress.setAttribute('aria-valuenow', s.percent); progress.querySelector('i').style.width = `${s.percent}%`; }
  const note = document.querySelector('#storage-note');
  if (note) note.textContent = storageAvailable ? '이 브라우저에 저장됩니다. 팀원과는 파일로 공유하세요. 가져오면 현재 체크를 파일 상태로 교체합니다.' : '브라우저 저장을 확인하지 못했어요. 체크 기록을 파일로 내보내 보관하세요.';
}

function exportChecks() {
  const blob = new Blob([JSON.stringify({app:'unis-team-handbook',version:1,exportedAt:new Date().toISOString(),baseline:h.commit,checks:state}, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `unis-team-checks-${new Date().toLocaleDateString('sv-SE', {timeZone:'Asia/Seoul'})}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  notify('체크 기록을 내보냈어요. 이 파일을 팀원에게 전달해 주세요.');
}

async function importChecks(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('100KB 이하의 체크 기록 파일을 골라 주세요.');
    const checks = validate(JSON.parse(await file.text()));
    if (!confirm('파일에 있는 체크 상태로 현재 체크를 교체할까요? 필요한 경우 취소 후 먼저 내 기록을 내보내 주세요.')) return;
    state = { ...Object.fromEntries(h.tasks.map(t => [t.id,t.done])), ...checks };
    persist(); renderTasks();
    if (storageAvailable) notify('파일의 체크 기록을 가져와 저장했어요.');
  } catch (error) { notify(error instanceof SyntaxError ? 'JSON 파일을 읽지 못했어요. 내보낸 체크 파일을 골라 주세요.' : error.message); }
}

function route() {
  const [requested, section] = location.hash.slice(1).split('/');
  if (requested === 'main' && currentView) { main.focus(); return; }
  const view = ['service','guide','roadmap'].includes(requested) ? requested : 'service';
  const changed = view !== currentView;
  if (changed) {
    currentView = view;
    for (const link of document.querySelectorAll('[data-view]')) {
      if (link.dataset.view === view) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    }
    if (view === 'roadmap') renderRoadmap(); else renderDocs(view);
    document.title = `${{service:'서비스 소개서',guide:'개발 가이드',roadmap:'개발 순서'}[view]} — UNIS 팀 핸드북`;
  }
  for (const link of toc.querySelectorAll('a')) link.classList.toggle('selected', link.hash === location.hash);
  if (section) requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({block:'start'}));
  else if (changed) window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  try {
    state = {...Object.fromEntries(h.tasks.map(t=>[t.id,t.done])), ...(e.newValue ? validate(JSON.parse(e.newValue)) : {})};
    if (currentView === 'roadmap') { renderTasks(); updateStats(); }
  } catch { notify('다른 창의 체크 기록을 읽지 못했어요.'); }
});
route();
