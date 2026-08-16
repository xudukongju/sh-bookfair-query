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

console.log('== 推荐路线可折叠 ==');
// 清空行程并加入一个位于 MAP_SPOTS 的出版社(Z-01)以产生路线点
E('itinerary.length=0; Object.keys(EXTRA_ITIN).forEach(k=>delete EXTRA_ITIN[k]); Object.keys(ITIN_NOTES).forEach(k=>delete ITIN_NOTES[k]);');
const tk = E('(function(){ let p=PUBS.find(x=>x.booth==="Z-01"); let k=pubKey(p,"2026-08-15"); toggleItin(k); return k; })()');
E('renderItin();');
const itinHtml = doc.getElementById('itinList').innerHTML;
ok('有路线点时渲染 route-wrap', itinHtml.includes('route-wrap'));
ok('route 标题带折叠切换按钮', itinHtml.includes('data-route-toggle'));
ok('默认折叠：route-body 带 hidden 类', itinHtml.includes('route-body hidden'));

// 模拟展开
E('saveRouteOpen(true); renderItin();');
const itinHtml2 = doc.getElementById('itinList').innerHTML;
ok('展开后 route-body 不再 hidden', itinHtml2.includes('route-body') && !itinHtml2.includes('route-body hidden'));

console.log('== 旧功能回归 ==');
ok('加入的出版社可被 findPubKey 命中', E('!!findPubKey(PUBS.find(x=>x.booth==="Z-01"))'));
E('addNote("'+tk+'", "集合时间 14:00");');
ok('留言仍可用', E('ITIN_NOTES["'+tk+'"].length') > 0);

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
if(fail) process.exit(1);
