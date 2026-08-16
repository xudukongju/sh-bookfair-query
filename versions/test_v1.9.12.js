const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('上海书展查询.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const window = dom.window;
const doc = window.document;
const E = (code) => window.eval(code);

let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗ FAIL:', name); } }

console.log('== 出版社同展位聚合 ==');
ok('PUB_GROUPS 已构建且有 >1 家的展位组', E('PUB_GROUPS.filter(g=>g.members.length>1).length') > 0);
const z01rep = E('PUB_GROUPS.find(g=>g.hall==="中央大厅"&&g.booth==="Z-01").rep.name');
console.log('  Z-01 代表名:', z01rep);
ok('Z-01 代表名含「集团」(最具代表性)', /集团/.test(z01rep));

console.log('== 出版社界面分组渲染 ==');
doc.getElementById('searchInput').value = '';
E('pubState.venue="all"; renderPubs();');
const pubHtml = doc.getElementById('pubList').innerHTML;
ok('无搜索时渲染出 pub-group 容器', pubHtml.includes('class="pub-group"'));
ok('展位组显示家数 badge (pg-count)', pubHtml.includes('pg-count'));
ok('展位组有折叠箭头 caret', pubHtml.includes('pg-caret'));

console.log('== 搜索时命中组自动展开 ==');
doc.getElementById('searchInput').value = '人民';
E('pubState.venue="all"; renderPubs();');
const shHtml = doc.getElementById('pubList').innerHTML;
ok('搜索「人民」出现匹配成员 pub-sub', shHtml.includes('pub-sub'));
ok('搜索命中组自动展开(无 hidden 的 group-body)', shHtml.includes('pub-group-body') && !shHtml.includes('pub-group-body hidden'));
ok('搜索结果含「人民」字样', shHtml.includes('人民'));

console.log('== 按展馆筛选 ==');
E('pubState.venue="中央大厅"; renderPubs();');
const vHtml = doc.getElementById('pubList').innerHTML;
ok('筛选中央大厅后不出现其他展馆(西一馆)', vHtml.indexOf('西一馆') === -1);
E('pubState.venue="all"; renderPubs();');
E('renderPubVenues();');
const chips = doc.getElementById('pubVenueChips').innerHTML;
ok('场地 chips 渲染含「全部展馆」', chips.includes('全部展馆'));
ok('场地 chips 含展馆数量 small 标签', chips.includes('<small>'));

console.log('== 推荐路线建筑拆分 ==');
// 直接验证 buildingOf 对阳光篷房的独立识别
ok('buildingOf("西阳光篷房")返回独立建筑', E('buildingOf("西阳光篷房")') === '西阳光篷房');
ok('buildingOf("东阳光篷房")返回独立建筑', E('buildingOf("东阳光篷房")') === '东阳光篷房');
ok('buildingOf("西一馆1层")仍为西一馆', E('buildingOf("西一馆1层")') === '西一馆');
ok('buildingOf("东一馆2层")仍为东一馆', E('buildingOf("东一馆2层")') === '东一馆');

// 清空行程并加入西一馆、东一馆、东阳光篷房展位，验证分成独立建筑卡片
E('itinerary.length=0; Object.keys(EXTRA_ITIN).forEach(k=>delete EXTRA_ITIN[k]); Object.keys(ITIN_NOTES).forEach(k=>delete ITIN_NOTES[k]); saveRouteOpen(true);');
E('(function(){ const w1P=PUBS.find(x=>x.booth && x.booth.startsWith("W1")); const e1P=PUBS.find(x=>x.booth && x.booth.startsWith("E1")); const eyP=PUBS.find(x=>x.booth && x.booth.startsWith("EY")); if(w1P) toggleItin(pubKey(w1P,"2026-08-15")); if(e1P) toggleItin(pubKey(e1P,"2026-08-15")); if(eyP) toggleItin(pubKey(eyP,"2026-08-15")); console.log("  测试展位:", w1P&&w1P.booth, e1P&&e1P.booth, eyP&&eyP.booth); })();');
E('renderItin();');
const itinHtml = doc.getElementById('itinList').innerHTML;
ok('路线渲染出东阳光篷房独立卡片', itinHtml.includes('东阳光篷房'));
ok('西一馆与东阳光篷房均分开展示', itinHtml.indexOf('西一馆') !== -1 && itinHtml.indexOf('东阳光篷房') !== -1);
// 检查顺序：西一馆应出现在中央大厅/东一馆之前，东阳光篷房应在东一馆之后
const idxW1 = itinHtml.indexOf('西一馆');
const idxE1 = itinHtml.indexOf('东一馆');
const idxEy = itinHtml.indexOf('东阳光篷房');
ok('顺序：西一馆在东一馆之前', idxW1 > 0 && idxW1 < idxE1);
ok('顺序：东一馆在东阳光篷房之前', idxE1 > 0 && idxE1 < idxEy);

console.log('== 推荐路线可折叠 ==');
ok('有路线点时渲染 route-wrap', itinHtml.includes('route-wrap'));
ok('route 标题带折叠切换按钮', itinHtml.includes('data-route-toggle'));

console.log('== 旧功能回归 ==');
E('(function(){ const p=PUBS.find(x=>x.booth==="Z-01"); if(p && !findPubKey(p)) toggleItin(pubKey(p,"2026-08-15")); })();');
ok('加入的出版社可被 findPubKey 命中', E('!!findPubKey(PUBS.find(x=>x.booth==="Z-01"))'));

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
if(fail) process.exit(1);
