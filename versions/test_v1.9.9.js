const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('上海书展查询.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;

window.eval('window.__PUBS = PUBS; window.__EVENTS = EVENTS; window.__pubKey = pubKey; window.__parsePubKey = parsePubKey; window.__boothKey = boothKey; window.__toggleItin = toggleItin; window.__renderItin = renderItin; window.__routePoints = routePoints; window.__orderFloor = orderFloor; window.__renderRoute = renderRoute; window.__findPubKey = findPubKey; window.__MAP_SPOTS = MAP_SPOTS;');

const PUBS = window.__PUBS;
const document = window.document;

function clearAll(){
  window.eval('itinerary.length = 0; Object.keys(EXTRA_ITIN).forEach(k=>delete EXTRA_ITIN[k]); Object.keys(ITIN_NOTES).forEach(k=>delete ITIN_NOTES[k]);');
}
function itin(){ return window.eval('itinerary'); }

clearAll();

// Test 1: empty itinerary -> no route block
window.__renderItin();
if(document.getElementById('itinList').innerHTML.includes('route-wrap')) throw new Error('route should not show when empty');
console.log('empty: no route ok');

// Test 2: add a few pubs across floors + a booth; route should appear and be ordered
// pub on 1F W1
const w1 = PUBS.find(p=>p.booth==='W1-01');
window.__toggleItin(window.__pubKey(w1, '2026-08-12'));
// pub on 2F W2
const w2 = PUBS.find(p=>p.hall.indexOf('西一馆二层')>=0);
window.__toggleItin(window.__pubKey(w2, '2026-08-12'));
// pub on 2F E2 (世纪)
const e2 = PUBS.find(p=>p.hall.indexOf('东一馆二层')>=0);
window.__toggleItin(window.__pubKey(e2, '2026-08-12'));
// booth: 黑龙江主宾省 (id34)
window.__toggleItin(window.__boothKey(34, '2026-08-12'));
// booth: 世纪出版 (id39, 2F E2)
window.__toggleItin(window.__boothKey(39, '2026-08-12'));
// booth: 阅界夜市 (id35, outdoor) -> should be skipped from route
window.__toggleItin(window.__boothKey(35, '2026-08-12'));

if(itin().length < 6) throw new Error('precondition: should have >=6 items, got '+itin().length);
window.__renderItin();
const itinHtml = document.getElementById('itinList').innerHTML;
if(!itinHtml.includes('route-wrap')) throw new Error('route-wrap missing');
if(!itinHtml.includes('route-svg')) throw new Error('route svg missing');
if(!itinHtml.includes('顺路路线')) throw new Error('route title missing');
if(!itinHtml.includes('在地图导览中查看')) throw new Error('route map button missing');
// 阅界夜市 (户外) should NOT be a numbered route point
if(itinHtml.includes('阅界夜市') && itinHtml.indexOf('阅界夜市') > itinHtml.indexOf('route-steps')) {
  // it may appear in the day list but not as route step; just ensure route has < total items count
}
console.log('route block rendered ok');

// Test 3: routePoints count excludes outdoor booth
const pts = window.__routePoints();
if(pts.length !== 5) throw new Error('routePoints should be 5 (excl outdoor 阅界夜市), got '+pts.length);
const floors = pts.map(p=>p.floor);
if(!floors.includes('1F') || !floors.includes('2F')) throw new Error('route should span both floors');
console.log('routePoints correct count + floors ok:', JSON.stringify(pts.map(p=>p.floor+':'+p.name)));

// Test 4: orderFloor is a greedy nearest-neighbor (every point appears once)
const f1 = pts.filter(p=>p.floor==='1F');
const ord = window.__orderFloor(f1);
if(ord.length !== f1.length) throw new Error('orderFloor lost points');
const set = new Set(ord);
if(set.size !== ord.length) throw new Error('orderFloor duplicates');
console.log('orderFloor unique ok');

// Test 5: route map button switches to map view
document.querySelector('[data-route-floor="2F"]').click();
if(window.eval('state.view') !== 'map') throw new Error('clicking route map btn did not switch to map');
if(window.eval('mapState.venue') !== '2F') throw new Error('map venue not set to 2F');
console.log('route map button -> map view ok');

// Test 6: removing all -> route disappears
clearAll();
window.__renderItin();
if(document.getElementById('itinList').innerHTML.includes('route-wrap')) throw new Error('route should disappear after clear');
console.log('route clears with itinerary ok');

console.log('--- TESTS PASSED ---');
