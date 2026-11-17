// 팀 문서 데이터에서 읽기 쉬운 Markdown 문서를 만듭니다.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const content = readFileSync(new URL('web/public/team/content.js', root), 'utf8');
const { handbook: h } = await import(`data:text/javascript;base64,${Buffer.from(content).toString('base64')}`);
function sections(items) {
  return items.map(s => `## ${s.title}\n\n${s.lead ? s.lead + '\n\n' : ''}${s.blocks.map(b => `### ${b.title}\n\n${b.body}${b.route ? `\n\n화면: \`${b.route}\`` : ''}`).join('\n\n')}`).join('\n\n');
}
const preface = `> ${h.date} 개정 · GitHub main \`${h.commit}\` 및 현재 코드 확인.\n> 웹앱: \`web\`에서 \`npm run dev\` → 터미널 주소 뒤 \`/team/index.html\`. 배포 후에는 Vercel 주소 뒤 같은 경로를 엽니다.\n> 내용 원본: \`web/public/team/content.js\`. 수정 후 저장소 루트에서 \`node scripts/build-handbook.mjs\`를 실행합니다. 기능·일정은 PRD, 계정은 11/4 멘토 결정과 AGENTS.md 우선.\n\n`;
const roadmap = h.phases.map(p => `### ${p.title} · ${p.when}\n\n${p.description}\n\n${h.tasks.filter(t=>t.phase===p.id).map(t=>`- [${t.done ? 'x':' '}] **${t.title}** — ${t.owner}\n  - 근거: ${t.evidence}\n  - 확인 기준: ${t.acceptance}`).join('\n')}`).join('\n\n');
writeFileSync(new URL('docs/소개서.md', root), `# 우니스(UNIS) 서비스 소개서\n\n${preface}**수업 일정과 취업 준비를 한곳에서, 대학생 AI 비서.**\n\n${sections(h.service)}\n`, 'utf8');
writeFileSync(new URL('docs/개발가이드.md', root), `# 우니스 개발 가이드 (팀 내부용)\n\n${preface}${sections(h.guide)}\n\n## 개발 순서 · 체크리스트\n\n초기 체크는 구현 확인이며 폰 통과가 아닙니다. 웹앱에서 바꾼 체크는 이 Markdown이나 Git에 자동 반영되지 않습니다. 팀원과 체크 파일을 공유하세요.\n\n${roadmap}\n`, 'utf8');
console.log(`소개서·개발 가이드 갱신 완료 (${fileURLToPath(root)})`);
