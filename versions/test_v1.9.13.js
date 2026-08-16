const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('上海书展查询.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const window = dom.window;
const doc = window.document;
const E = (code) => window.eval(code);

let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗ FAIL:', name); } }

console.log('== 出版社同展位聚合（回归）==');
ok('PUB_GROUPS 已构建且有 >1 家的展位组', E('PUB_GROUPS.filter(g=>g.members.length>1).length') > 0);
const z01rep = E('PUB_GROUPS.find(g=>g.hall==="中央大厅"&&g.booth==="Z-01").rep.name');
console.log('  Z-01 代表名:', z01rep);
ok('Z-01 代表名含「集团」', /集团/.test(z01rep));

console.log('== 按展馆筛选（回归）==');
E('pubState.venue="中央大厅"; renderPubs();');
const vHtml = doc.getElementById('pubList').innerHTML;
ok('筛选中央大厅后不出现西一馆', vHtml.indexOf('西一馆') === -1);
E('pubState.venue="all"; renderPubs(); renderPubVenues();');
ok('场地 chips 含「全部展馆」', doc.getElementById('pubVenueChips').innerHTML.includes('全部展馆'));

console.log('== 推荐路线建筑拆分（回归）==');
ok('buildingOf("西阳光篷房")返回独立建筑', E('buildingOf("西阳光篷房")') === '西阳光篷房');
ok('buildingOf("东阳光篷房")返回独立建筑', E('buildingOf("东阳光篷房")') === '东阳光篷房');
ok('buildingOf("西一馆1层")仍为西一馆', E('buildingOf("西一馆1层")') === '西一馆');

console.log('== 行程改日期功能 ==');
E('itinerary.length=0; Object.keys(EXTRA_ITIN).forEach(k=>delete EXTRA_ITIN[k]); Object.keys(ITIN_NOTES).forEach(k=>delete ITIN_NOTES[k]); notesOpen=new Set(); saveRouteOpen(true);');
// 加入三个不同日期的项目：出版社、常驻展区、排片
E('(function(){ const p=PUBS.find(x=>x.booth==="Z-01"); if(p) toggleItin(pubKey(p,"2026-08-12")); })();');
E('(function(){ const e=EVENTS.find(x=>x.type==="booth"); if(e) toggleItin("e"+e.id+"@2026-08-12"); })();');
E('(function(){ const a=schedAll().find(x=>x.d===12 && x.s); if(a){ toggleItin("s"+encodeURIComponent([a.d,a.s,a.n].join("|"))); } })();');
ok('初始：出版社在 8.12', E('itinerary.some(k=>k[0]==="p" && dateOfKey(k)==="2026-08-12")'));
ok('初始：常驻展区在 8.12', E('itinerary.some(k=>k[0]==="e" && dateOfKey(k)==="2026-08-12")'));
ok('初始：排片在 8.12', E('itinerary.some(k=>k[0]==="s" && dateOfKey(k)==="2026-08-12")'));

// 改出版社日期
E('(function(){ const k=itinerary.find(x=>x[0]==="p"); changeItinDate(k,"2026-08-15"); })();');
ok('改后：出版社移到 8.15', E('itinerary.some(k=>k[0]==="p" && dateOfKey(k)==="2026-08-15")'));
ok('改后：出版社旧日期不再出现', E('!itinerary.some(k=>k[0]==="p" && dateOfKey(k)==="2026-08-12")'));
ok('改后：EXTRA_ITIN 中出版社 date 更新', E('Object.values(EXTRA_ITIN).some(v=>v.type==="pub"&&v.date==="2026-08-15")'));

// 改常驻展区日期
E('(function(){ const k=itinerary.find(x=>x[0]==="e"); changeItinDate(k,"2026-08-16"); })();');
ok('改后：常驻展区移到 8.16', E('itinerary.some(k=>k[0]==="e" && dateOfKey(k)==="2026-08-16")'));
ok('改后：常驻展区旧日期不再出现', E('!itinerary.some(k=>k[0]==="e" && dateOfKey(k)==="2026-08-12")'));

// 改排片日期 + 留言跟随迁移
E('(function(){ const k=itinerary.find(x=>x[0]==="s"); window.__sk=k; if(k){ addNote(k, "集合时间14:00"); } })();');
ok('改前：排片有留言', E('!!ITIN_NOTES[window.__sk] && ITIN_NOTES[window.__sk].length>0'));
E('(function(){ const k=window.__sk; changeItinDate(k,"2026-08-17"); })();');
ok('改后：排片移到 8.17', E('itinerary.some(k=>k[0]==="s" && dateOfKey(k)==="2026-08-17")'));
ok('改后：排片旧日期不再出现', E('!itinerary.some(k=>k[0]==="s" && dateOfKey(k)==="2026-08-12")'));
ok('改后：留言跟随迁移到新 key', E('(function(){ const nk=itinerary.find(k=>k[0]==="s"); return ITIN_NOTES[nk] && ITIN_NOTES[nk].length>0; })()'));

// 改到相同日期应无变化
E('(function(){ const k=itinerary.find(x=>x[0]==="p"); const before=itinerary.length; changeItinDate(k,"2026-08-15"); return before===itinerary.length; })();');
ok('改到相同日期 itinerary 长度不变', E('(function(){ const k=itinerary.find(x=>x[0]==="p"); const before=itinerary.length; changeItinDate(k,"2026-08-15"); return before===itinerary.length; })()'));

console.log('== 推荐路线按天生成 + 纯文字 ==');
// 8.15 加一个东一馆出版社、8.17 加一个西一馆出版社，验证路线分天
E('(function(){ const e1p=PUBS.find(x=>x.booth && x.booth.startsWith("E1")); const w1p=PUBS.find(x=>x.booth && x.booth.startsWith("W1")); if(e1p) toggleItin(pubKey(e1p,"2026-08-15")); if(w1p) toggleItin(pubKey(w1p,"2026-08-17")); })();');
E('renderItin();');
const itinHtml = doc.getElementById('itinList').innerHTML;
// 每天一个 route-wrap
ok('存在多个 route-wrap（按天）', (itinHtml.match(/route-wrap/g)||[]).length >= 3);
ok('路线纯文字：不再渲染 SVG 图片', !itinHtml.includes('route-svg') && !itinHtml.includes('<svg'));
ok('路线含步骤序号 rn', itinHtml.includes('class="rn"'));
ok('路线含展位号标签 rc', itinHtml.includes('class="rc"'));
ok('路线含「在地图导览中查看」按钮', itinHtml.includes('在地图导览中查看'));
ok('路线可折叠：有 data-route-toggle', itinHtml.includes('data-route-toggle'));
// 直接取每天的路线块 HTML 验证按天隔离（排除 route-tip 固定文案干扰）
const r15 = E('renderRouteForDate("2026-08-15")').split('route-tip')[0];
const r17 = E('renderRouteForDate("2026-08-17")').split('route-tip')[0];
ok('8.15 路线含东一馆', r15.includes('东一馆'));
ok('8.15 路线不含西一馆（西一馆在8.17）', r15.indexOf('西一馆') === -1);
ok('8.17 路线含西一馆', r17.includes('西一馆'));
ok('8.17 路线不含东一馆（东一馆在8.15）', r17.indexOf('东一馆') === -1);

console.log('== 旧功能回归 ==');
ok('加入的出版社可被 findPubKey 命中', E('!!findPubKey(PUBS.find(x=>x.booth==="Z-01"))'));
ok('行程卡片含「改日期」按钮', doc.getElementById('itinList').innerHTML.includes('data-change-date'));

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
if(fail) process.exit(1);
