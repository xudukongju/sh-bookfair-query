const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('上海书展查询.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;

window.eval('window.__PUBS = PUBS; window.__EVENTS = EVENTS; window.__pubKey = pubKey; window.__parsePubKey = parsePubKey; window.__migratePubKeys = migratePubKeys; window.__migrateBoothKeys = migrateBoothKeys; window.__boothKey = boothKey; window.__findBoothKey = findBoothKey; window.__findPubKey = findPubKey; window.__isBoothEvt = isBoothEvt; window.__inItin = inItin; window.__toggleItin = toggleItin; window.__renderPubs = renderPubs; window.__renderItin = renderItin; window.__renderEvents = renderEvents; window.__renderSchedule = renderSchedule; window.__addNote = addNote; window.__delNote = delNote; window.__fmtNoteTime = fmtNoteTime; window.__escapeHtml = escapeHtml;');

const PUBS = window.__PUBS;
const EVENTS = window.__EVENTS;
const document = window.document;

function keyOf(p, date){ return window.__pubKey(p, date); }
function boothKey(id, date){ return window.__boothKey(id, date); }
function clearAll(){
  window.eval('itinerary.length = 0; Object.keys(EXTRA_ITIN).forEach(k=>delete EXTRA_ITIN[k]); Object.keys(ITIN_NOTES).forEach(k=>delete ITIN_NOTES[k]);');
}
function itin(){ return window.eval('itinerary'); }
function notes(){ return window.eval('ITIN_NOTES'); }
function extra(){ return window.eval('EXTRA_ITIN'); }

// --- baseline: clean slate ---
clearAll();

// Test 1: add booth with date key
const b34 = boothKey(34, '2026-08-15');
window.__toggleItin(b34);
if(!itin().includes(b34)) throw new Error('booth e34@2026-08-15 not added');
if(!window.__inItin('e34')) throw new Error('inItin("e34") should be true for booth');
if(!window.__inItin(b34)) throw new Error('inItin(dateKey) should be true');
console.log('booth add with date ok:', b34);

// Test 2: booth grouped under chosen date
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
window.__toggleItin('e34');
if(itin().includes(b34)) throw new Error('booth not removed');
if(notes()[b34]) throw new Error('booth notes not cleared');
console.log('booth removal cascades to notes ok');

// Test 5: old e{id} booth key migration
clearAll();
window.eval("itinerary.push('e34'); ITIN_NOTES['e34'] = [{ t: Date.now(), text: '旧 booth 留言' }];");
window.__migrateBoothKeys();
const notes2 = notes();
if(!itin().includes(boothKey(34,'2026-08-12'))) throw new Error('old booth key not migrated');
if(!notes2[boothKey(34,'2026-08-12')] || !notes2[boothKey(34,'2026-08-12')].some(n=>n.text==='旧 booth 留言')) throw new Error('booth note not migrated');
console.log('old booth key migrated with note ok');

// Test 6: renderEvents shows booth added
clearAll();
window.__toggleItin(boothKey(41, '2026-08-14'));
window.__renderEvents();
const evHtml = document.getElementById('eventList').innerHTML;
const card41 = evHtml.split('data-id="41"')[1];
if(!card41 || !card41.includes('已加入')) throw new Error('booth 41 not shown as added');
console.log('renderEvents booth added ok');

// Test 7: XSS escape
window.__addNote(boothKey(41,'2026-08-14'), '<script>alert(1)</script>');
window.__renderItin();
if(!document.getElementById('itinList').innerHTML.includes('&lt;script&gt;')) throw new Error('XSS escape broken');
console.log('XSS escape ok');

// Test 8: Mo Yan dedup
window.eval('schedState.scope="main"; schedState.date="15"; schedState.venue="all"; schedState.q=""; renderSchedule();');
const moyan = (document.getElementById('schedList').innerHTML.match(/莫言《人呐》/g) || []).length;
if(moyan !== 1) throw new Error('Mo Yan duplicated: '+moyan);
console.log('Mo Yan dedup ok');

// === NEW v1.9.8: PUBLISHER DATE PICKER ===
// Test 9: publisher add via base key opens date sheet, pick -> dated key
clearAll();
const baseKey = keyOf(PUBS[0]);
if(window.__findPubKey(PUBS[0])) throw new Error('precondition: pub should not be added');
window.__toggleItin(baseKey); // opens date sheet
const sheet = document.getElementById('sheet');
if(!sheet.querySelector('[data-dp]')) throw new Error('date picker sheet not opened for publisher');
// click 08/16
const target = '2026-08-16';
sheet.querySelector('[data-dp="'+target+'"]').click();
const pdated = keyOf(PUBS[0], target);
if(!itin().includes(pdated)) throw new Error('publisher dated key not added after picker: '+JSON.stringify(itin()));
if(!window.__findPubKey(PUBS[0])) throw new Error('findPubKey should detect added publisher');
if(extra()[pdated].date !== target) throw new Error('EXTRA_ITIN date mismatch: '+extra()[pdated].date);
console.log('publisher add with date picker ok:', pdated);

// Test 10: renderPubs shows added for base key
window.__renderPubs();
const pubHtml = document.getElementById('pubList').innerHTML;
if(!pubHtml.includes('已加入')) throw new Error('publisher not shown as added in pub list');
console.log('renderPubs added state ok');

// Test 11: clicking added publisher (base key) removes it
window.__toggleItin(baseKey);
if(itin().includes(pdated)) throw new Error('publisher not removed via base key');
console.log('publisher removal via base key ok');

// Test 12: old pub key (no date) migration -> default 2026-08-12
clearAll();
window.eval("itinerary.push('p"+PUBS[1].name+"|"+PUBS[1].booth+"'); ITIN_NOTES['p"+PUBS[1].name+"|"+PUBS[1].booth+"'] = [{ t: Date.now(), text: '旧 pub 留言' }];");
window.__migratePubKeys();
const p1dated = keyOf(PUBS[1], '2026-08-12');
if(!itin().includes(p1dated)) throw new Error('old pub key not migrated to dated: '+JSON.stringify(itin()));
if(extra()[p1dated].date !== '2026-08-12') throw new Error('migrated pub date should be 2026-08-12');
if(!notes()[p1dated] || !notes()[p1dated].some(n=>n.text==='旧 pub 留言')) throw new Error('pub note not migrated');
console.log('old pub key migrated with date + note ok');

// === NEW v1.9.8: CLEAR BUTTON FIX ===
// Test 13: clearAll button -> confirm sheet -> cfYes clears everything
clearAll();
window.__toggleItin(keyOf(PUBS[2], '2026-08-17'));
window.__toggleItin(boothKey(40, '2026-08-13'));
window.__addNote(keyOf(PUBS[2], '2026-08-17'), '买书');
if(itin().length < 2) throw new Error('precondition: should have 2 items');
document.getElementById('clearAll').click(); // opens confirm sheet
const sheet2 = document.getElementById('sheet');
if(!sheet2.querySelector('#cfYes')) throw new Error('confirm sheet not opened on clearAll');
sheet2.querySelector('#cfYes').click(); // confirm
if(itin().length !== 0) throw new Error('clearAll did not empty itinerary: '+itin().length);
if(Object.keys(notes()).length !== 0) throw new Error('clearAll did not clear notes');
if(Object.keys(extra()).length !== 0) throw new Error('clearAll did not clear EXTRA_ITIN');
window.__renderItin();
if(!document.getElementById('itinList').innerHTML.includes('行程还是空的')) throw new Error('empty state not shown after clear');
console.log('clearAll button clears itinerary + notes ok');

console.log('--- TESTS PASSED ---');
