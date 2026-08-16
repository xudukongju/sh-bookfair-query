const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('上海书展查询.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;

window.eval('window.__PUBS = PUBS; window.__EVENTS = EVENTS; window.__pubKey = pubKey; window.__parsePubKey = parsePubKey; window.__migratePubKeys = migratePubKeys; window.__migrateBoothKeys = migrateBoothKeys; window.__boothKey = boothKey; window.__findBoothKey = findBoothKey; window.__isBoothEvt = isBoothEvt; window.__inItin = inItin; window.__toggleItin = toggleItin; window.__renderPubs = renderPubs; window.__renderItin = renderItin; window.__renderEvents = renderEvents; window.__addNote = addNote; window.__delNote = delNote; window.__fmtNoteTime = fmtNoteTime; window.__escapeHtml = escapeHtml;');

const PUBS = window.__PUBS;
const EVENTS = window.__EVENTS;
const document = window.document;

function keyOf(p){ return window.__pubKey(p); }
function boothKey(id, date){ return window.__boothKey(id, date); }
function clearAll(){
  window.eval('itinerary.length = 0; Object.keys(EXTRA_ITIN).forEach(k=>delete EXTRA_ITIN[k]); Object.keys(ITIN_NOTES).forEach(k=>delete ITIN_NOTES[k]);');
}
function itin(){ return window.eval('itinerary'); }
function notes(){ return window.eval('ITIN_NOTES'); }

// --- baseline: clean slate ---
clearAll();

// Test 1: add booth with date key
const b34 = boothKey(34, '2026-08-15');
window.__toggleItin(b34);
if(!itin().includes(b34)) throw new Error('booth e34@2026-08-15 not added');
if(!window.__inItin('e34')) throw new Error('inItin("e34") should be true for booth');
if(!window.__inItin(b34)) throw new Error('inItin(dateKey) should be true');
console.log('booth add with date ok:', b34);

// Test 2: booth appears under chosen date in itinerary
window.__renderItin();
const itinHtml = document.getElementById('itinList').innerHTML;
if(!itinHtml.includes('08/15 周六')) throw new Error('booth not grouped under 08/15');
if(!itinHtml.includes('黑龙江主宾省')) throw new Error('booth name not rendered');
console.log('booth grouped under selected date ok');

// Test 3: note on booth date key
window.__addNote(b34, '15号下午去盖章');
if(!notes()[b34] || notes()[b34].length!==1) throw new Error('note not added to booth date key');
console.log('booth note ok');

// Test 4: removing booth clears its notes
window.__toggleItin('e34'); // should resolve to b34 and remove
if(itin().includes(b34)) throw new Error('booth not removed');
if(notes()[b34]) throw new Error('booth notes not cleared');
console.log('booth removal cascades to notes ok');

// Test 5: old e{id} booth key migration -> e{id}@2026-08-12
clearAll();
window.eval("itinerary.push('e34'); ITIN_NOTES['e34'] = [{ t: Date.now(), text: '旧 booth 留言' }];");
window.__migrateBoothKeys();
const itin2 = itin();
const notes2 = notes();
if(!itin2.includes(boothKey(34,'2026-08-12'))) throw new Error('old booth key not migrated');
if(!notes2[boothKey(34,'2026-08-12')] || !notes2[boothKey(34,'2026-08-12')].some(n=>n.text==='旧 booth 留言')) throw new Error('booth note not migrated');
console.log('old booth key migrated with note ok');

// Test 6: renderEvents shows booth as added
clearAll();
window.__toggleItin(boothKey(41, '2026-08-14'));
window.__renderEvents();
const evHtml = document.getElementById('eventList').innerHTML;
const card41 = evHtml.split('data-id="41"')[1];
if(!card41 || !card41.includes('已加入')) throw new Error('booth 41 not shown as added in event list');
console.log('renderEvents booth added state ok');

// Test 7: XSS escape still works on notes
window.__addNote(boothKey(41,'2026-08-14'), '<script>alert(1)</script>');
window.__renderItin();
const html2 = document.getElementById('itinList').innerHTML;
if(!html2.includes('&lt;script&gt;')) throw new Error('XSS escape broken');
console.log('XSS escape ok');

// Test 8: publisher key migration + note still works (regression)
clearAll();
const pk = keyOf(PUBS[0]);
window.eval("itinerary.push('p0'); ITIN_NOTES['p0'] = [{ t: Date.now(), text: '旧索引留言' }];");
window.__migratePubKeys();
const itin3 = itin();
const notes3 = notes();
if(!itin3.includes(pk)) throw new Error('migrated pub key missing: ' + JSON.stringify(itin3));
if(!notes3[pk] || !notes3[pk].some(n=>n.text==='旧索引留言')) throw new Error('note not migrated with pub key');
console.log('pub note migrated ok');

// Test 9: Mo Yan dedup still passes
window.eval('schedState.scope="main"; schedState.date="15"; schedState.venue="all"; schedState.q=""; renderSchedule();');
const schedHtml = document.getElementById('schedList').innerHTML;
const moyanCount = (schedHtml.match(/莫言《人呐》/g) || []).length;
if(moyanCount !== 1) throw new Error('Mo Yan event duplicated in schedule: '+moyanCount);
console.log('Mo Yan dedup ok');

console.log('--- TESTS PASSED ---');
