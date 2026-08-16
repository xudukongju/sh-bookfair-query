const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('上海书展查询.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;

window.eval('window.__PUBS = PUBS; window.__EVENTS = EVENTS; window.__pubKey = pubKey; window.__parsePubKey = parsePubKey; window.__boothKey = boothKey; window.__toggleItin = toggleItin; window.__renderItin = renderItin; window.__routePoints = routePoints; window.__orderRoute = orderRoute; window.__renderRoute = renderRoute; window.__findPubKey = findPubKey; window.__MAP_SPOTS = MAP_SPOTS; window.__BASE_SCHEMATIC = BASE_SCHEMATIC;');

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

// Test 2: add cross-building / cross-floor items
const w1 = PUBS.find(p=>p.booth==='W1-01'); // 西一馆 1F
const w2 = PUBS.find(p=>p.hall.indexOf('西一馆二层')>=0); // 西一馆 2F
const e2 = PUBS.find(p=>p.hall.indexOf('东一馆二层')>=0); // 东一馆 2F
const e1 = PUBS.find(p=>p.booth==='E1-01'); // 东一馆 1F
const z2 = PUBS.find(p=>p.booth==='Z-02'); // 中央大厅 1F
if(!w1 || !w2 || !e2 || !e1 || !z2) throw new Error('precondition: required pubs missing');

window.__toggleItin(window.__pubKey(w1, '2026-08-12'));
window.__toggleItin(window.__pubKey(w2, '2026-08-12'));
window.__toggleItin(window.__pubKey(e2, '2026-08-12'));
window.__toggleItin(window.__pubKey(e1, '2026-08-12'));
window.__toggleItin(window.__pubKey(z2, '2026-08-12'));
window.__toggleItin(window.__boothKey(34, '2026-08-12')); // 黑龙江主宾省 中央大厅 1F
window.__toggleItin(window.__boothKey(39, '2026-08-12')); // 世纪出版 东一馆 2F
window.__toggleItin(window.__boothKey(35, '2026-08-12')); // 阅界夜市 户外 -> skipped

if(itin().length < 8) throw new Error('precondition: should have >=8 items, got '+itin().length);

// Test 3: routePoints exclude outdoor, all coords inside SCHEMATIC
const pts = window.__routePoints();
if(pts.length !== 7) throw new Error('routePoints should be 7 (excl outdoor 阅界夜市), got '+pts.length);
pts.forEach(p=>{
  const sc = window.__BASE_SCHEMATIC[p.floor];
  if(p.x < 0 || p.x > sc.w || p.y < 0 || p.y > sc.h) throw new Error('point out of schematic bounds: '+p.name+' ('+p.x+','+p.y+')');
  if(!p.building) throw new Error('point missing building: '+p.name);
});
console.log('routePoints count + bounds ok:', pts.length);

// Test 4: orderRoute groups by building, then floor
const ordered = window.__orderRoute(pts);
const buildingSequence = ordered.map(p=>p.building);
// 西一馆 should come before 中央大厅 before 东一馆
const firstWest = buildingSequence.indexOf('西一馆');
const firstCenter = buildingSequence.indexOf('中央大厅');
const firstEast = buildingSequence.indexOf('东一馆');
if(firstWest > firstCenter) throw new Error('西一馆 should be before 中央大厅');
if(firstCenter > firstEast) throw new Error('中央大厅 should be before 东一馆');
// within each building, 1F before 2F
function firstIndex(arr, pred){ for(let i=0;i<arr.length;i++) if(pred(arr[i])) return i; return -1; }
const west1F = firstIndex(ordered, p=>p.building==='西一馆'&&p.floor==='1F');
const west2F = firstIndex(ordered, p=>p.building==='西一馆'&&p.floor==='2F');
if(west2F < west1F) throw new Error('within 西一馆, 1F should be before 2F');
const east1F = firstIndex(ordered, p=>p.building==='东一馆'&&p.floor==='1F');
const east2F = firstIndex(ordered, p=>p.building==='东一馆'&&p.floor==='2F');
if(east2F < east1F) throw new Error('within 东一馆, 1F should be before 2F');
console.log('orderRoute building->floor ok:', ordered.map(p=>p.building+' '+p.floor+' '+p.name).join(' | '));

// Test 5: renderRoute output contains compact SVG + steps
const routeHtml = window.__renderRoute();
if(!routeHtml.includes('route-wrap')) throw new Error('route-wrap missing');
if(!routeHtml.includes('route-svg')) throw new Error('route svg missing');
if(!routeHtml.includes('西一馆')) throw new Error('西一馆 card missing');
if(!routeHtml.includes('中央大厅')) throw new Error('中央大厅 card missing');
if(!routeHtml.includes('东一馆')) throw new Error('东一馆 card missing');
if(!routeHtml.includes('按建筑串联')) throw new Error('title missing');
// route numbers should be 1..7
for(let i=1;i<=7;i++) if(!routeHtml.includes('>'+i+'<')) throw new Error('route number '+i+' missing');
console.log('renderRoute output ok');

// Test 6: renderItin integrates route and map button works
window.__renderItin();
const itinHtml = document.getElementById('itinList').innerHTML;
if(!itinHtml.includes('route-wrap')) throw new Error('route not rendered in itin page');
const btn = document.querySelector('[data-route-floor="1F"]');
if(!btn) throw new Error('route map button missing');
btn.click();
if(window.eval('state.view') !== 'map') throw new Error('clicking route map btn did not switch to map');
console.log('route map button -> map view ok');

// Test 7: clearing removes route
clearAll();
window.__renderItin();
if(document.getElementById('itinList').innerHTML.includes('route-wrap')) throw new Error('route should disappear after clear');
console.log('route clears with itinerary ok');

console.log('--- TESTS PASSED ---');
