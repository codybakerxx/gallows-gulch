// ---------- THE WORD BOOK: every word you've finished a round on, with what it means ----------
// When a round ends the sign shows the word's meaning (11b) and the word goes in the book, marked solved or missed. The book lives on this
// device (localStorage) and, where the page can, in your own private corner of the artifact's database (db: data/users/<id>/wordbook,
// which nobody else can read), so it outlasts a cleared browser and follows you between devices. At load the database is touched only
// if it's already allowed; otherwise the first time you open the book (where the page may ask you), and from then on whenever a word
// goes in. One document holds the whole book; a copy from another device is folded in, never written over.
const BOOK = { words: {}, ref: null, unsub: null, chain: Promise.resolve(), connecting: false, sort: "new", find: "" };
const BOOK_KEY = "gallows-gulch-words-v1";
const bookValid = e => !!e && typeof e === "object" && isFinite(e.t) && isFinite(e.n) && isFinite(e.s);
function bookLoadLocal() { try { const o = JSON.parse(localStorage.getItem(BOOK_KEY) || "null"); if (o && o.words) bookMerge(BOOK.words, o.words); } catch (e) {} }
function bookSaveLocal() { try { localStorage.setItem(BOOK_KEY, JSON.stringify({ v: 1, words: BOOK.words })); } catch (e) {} }
// fold another copy in: a word either copy knows is kept, first seen at the earlier time, played and solved the larger number of times
function bookMerge(into, from) {
  let changed = false;
  for (const w in from) { const b = from[w]; if (!/^[A-Z]{4,12}$/.test(w) || !bookValid(b) || !wordInfo(w)) continue; const a = into[w];
    if (!a) { into[w] = { t: +b.t, n: +b.n, s: +b.s }; changed = true; continue; }
    const t = Math.min(a.t, +b.t), n = Math.max(a.n, +b.n), s = Math.max(a.s, +b.s);
    if (t !== a.t || n !== a.n || s !== a.s) { into[w] = { t, n, s }; changed = true; } }
  return changed;
}
// the round is over: the word goes in, or its tally goes up. True when it's new to the book.
function bookAdd(w, solved) {
  if (!wordInfo(w)) return false; const e = BOOK.words[w], isNew = !e;
  BOOK.words[w] = e ? { t: e.t, n: e.n + 1, s: e.s + (solved ? 1 : 0) } : { t: Date.now(), n: 1, s: solved ? 1 : 0 };
  bookSaveLocal(); bookPush(); bookBadge(); bookRender(); return isNew;
}
// the whole book to the database, one write at a time; a refusal (a view-only visitor, a withdrawn grant) keeps it on this device
function bookPush() {
  if (!BOOK.ref) return; const ref = BOOK.ref, body = { v: 1, words: JSON.parse(JSON.stringify(BOOK.words)) };
  BOOK.chain = BOOK.chain.then(() => ref.set(body)).catch(e => { const c = e && e.code; if (c !== "unavailable" && c !== "resource_exhausted") bookDisconnect(); });
}
function bookDisconnect() { if (BOOK.unsub) { try { BOOK.unsub(); } catch (e) {} } BOOK.unsub = null; BOOK.ref = null; bookSyncNote(); }
const bookDiffers = remote => Object.keys(BOOK.words).some(w => { const a = BOOK.words[w], b = remote[w]; return !b || a.t !== b.t || a.n !== b.n || a.s !== b.s; });
// ask: may this call bring up the page's permission prompt (only from opening the book, never at load)
async function bookConnect(ask) {
  if (BOOK.ref || BOOK.connecting || !window.claude || typeof window.claude.use !== "function") return;
  BOOK.connecting = true;
  try {
    if (!ask) { const P = await window.claude.use("permissions"); if (!P || (await P.state("db")) !== "granted") return; }
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); if (!db || !user) return;
    const uid = await user.id(); if (!uid) return; // (no private corner without an id: the book stays on this device)
    const ref = db.doc("data/users/" + uid + "/wordbook"), snap = await ref.get();
    const remote = (snap.exists && (snap.data() || {}).words) || {};
    if (bookMerge(BOOK.words, remote)) { bookSaveLocal(); bookBadge(); bookRender(); }
    BOOK.ref = ref; if (bookDiffers(remote)) bookPush(); // what only this device had goes up, once
    BOOK.unsub = ref.onSnapshot(s => { const d = s.exists && s.data(); if (d && d.words && bookMerge(BOOK.words, d.words)) { bookSaveLocal(); bookBadge(); bookRender(); } }, () => { BOOK.unsub = null; });
  } catch (e) { /* declined or unavailable: the book stays on this device */ }
  finally { BOOK.connecting = false; bookSyncNote(); }
}

// ---- on the sign: what the word means, and whether it just went in the book ----
function signMeaning(w, solved) {
  const I = wordInfo(w), el = $("signDef"), nw = $("signNew");
  if (!I || !I.def) { el.hidden = nw.hidden = true; return; }
  const pos = document.createElement("i"); pos.textContent = I.pos;
  el.replaceChildren(pos, document.createTextNode(" · " + I.def)); el.hidden = false;
  if (STATE.bookedRound !== STATE.roundId) { STATE.bookedRound = STATE.roundId; STATE.bookNew = bookAdd(w, solved); } // (once a round: cut down after GAME OVER, it shows on two signs)
  nw.hidden = !STATE.bookNew;
}

// ---- the book itself, opened from the menu ----
function bookBadge() { const n = Object.keys(BOOK.words).length; $("bookN").textContent = n; $("bookBtn").setAttribute("aria-label", `Word Book: ${n} word${n === 1 ? "" : "s"} learned`); }
function bookSyncNote() { const el = $("bookSync"); if (el) el.textContent = BOOK.ref ? "Saved to your account, on every device you play on." : "Saved in this browser."; }
function bookRender() {
  if ($("book").hidden) return;
  const all = Object.keys(BOOK.words), q = BOOK.find.trim().toUpperCase();
  $("bookCount").textContent = `${all.length} of ${WORDS.length} words`;
  let list = all.map(w => ({ w, e: BOOK.words[w], I: wordInfo(w) })).filter(x => x.I);
  if (q) list = list.filter(x => x.w.includes(q) || x.I.def.toUpperCase().includes(q));
  list.sort(BOOK.sort === "az" ? (a, b) => a.w < b.w ? -1 : 1 : (a, b) => b.e.t - a.e.t || (a.w < b.w ? -1 : 1));
  const ol = $("bookList"), frag = document.createDocumentFragment();
  for (const { w, e, I } of list) {
    const li = document.createElement("li"), head = document.createElement("div"), b = document.createElement("b"), i = document.createElement("i"), m = document.createElement("span"), p = document.createElement("p");
    head.className = "lw"; b.textContent = w; i.textContent = I.pos;
    m.className = "lmark " + (e.s > 0 ? "ok" : "no"); m.textContent = e.s > 0 ? "Solved" : "Missed"; m.title = `Played ${e.n} time${e.n === 1 ? "" : "s"}, solved ${e.s}`;
    p.textContent = I.def; head.append(b, i, m); li.append(head, p); frag.appendChild(li);
  }
  ol.replaceChildren(frag);
  const empty = $("bookEmpty"); empty.hidden = list.length > 0;
  empty.textContent = all.length ? `No words match “${BOOK.find.trim()}”.` : "Nothing here yet. Finish a round and its word goes in your book, with what it means.";
  for (const s of document.querySelectorAll("#book .lsort button")) s.setAttribute("aria-pressed", String(s.dataset.sort === BOOK.sort));
}
function bookOpen() { $("book").hidden = false; BOOK.find = ""; $("bookFind").value = ""; $("bookList").scrollTop = 0; bookSyncNote(); bookRender(); $("bookClose").focus({ preventScroll: true }); bookConnect(true); }
function bookClose() { $("book").hidden = true; $("bookBtn").focus({ preventScroll: true }); }
function bookInit() {
  bookLoadLocal(); bookBadge();
  $("bookBtn").addEventListener("click", bookOpen); $("bookClose").addEventListener("click", bookClose);
  $("book").addEventListener("pointerdown", e => { if (e.target === $("book")) bookClose(); }); // (a tap outside the page closes it)
  $("bookFind").addEventListener("input", e => { BOOK.find = e.target.value; bookRender(); });
  for (const s of document.querySelectorAll("#book .lsort button")) s.addEventListener("click", () => { BOOK.sort = s.dataset.sort; bookRender(); });
  setTimeout(() => bookConnect(false), 0); // (only if the page is already allowed to keep it for you)
}
