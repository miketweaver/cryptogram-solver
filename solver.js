"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  rawText: "",        // original cipher, normalized to uppercase for display
  mapping: {},        // { cipherChar: plaintextChar }
  selected: null,     // currently selected cipher character (highlighted), or null
  cursor: null,       // index into `positions` of the active cell, or null
  positions: [],      // chars of every interactive cell, in reading order
};

const isLetter = (ch) => ch >= "A" && ch <= "Z";

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------
const els = {
  inputView: document.getElementById("input-view"),
  solverView: document.getElementById("solver-view"),
  cipherInput: document.getElementById("cipher-input"),
  solveBtn: document.getElementById("solve-btn"),
  newPuzzleBtn: document.getElementById("new-puzzle-btn"),
  clearGuessesBtn: document.getElementById("clear-guesses-btn"),
  display: document.getElementById("cipher-display"),
  stats: document.getElementById("stats"),
};

// ---------------------------------------------------------------------------
// Flow: submit / reset
// ---------------------------------------------------------------------------
function startSolving() {
  const text = els.cipherInput.value;
  if (!text.trim()) {
    els.cipherInput.focus();
    return;
  }
  state.rawText = text.toUpperCase();
  state.mapping = {};
  state.selected = null;
  state.cursor = null;

  renderCipher();
  renderStats(computeStats(state.rawText));

  els.inputView.classList.add("hidden");
  els.solverView.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function newPuzzle() {
  els.solverView.classList.add("hidden");
  els.inputView.classList.remove("hidden");
  els.cipherInput.focus();
  els.cipherInput.select();
}

function clearGuesses() {
  state.mapping = {};
  renderCipher();
}

// ---------------------------------------------------------------------------
// Rendering the interactive cipher grid
// ---------------------------------------------------------------------------
function renderCipher() {
  const display = els.display;
  display.textContent = "";
  state.positions = [];

  // Split into tokens on whitespace so each run becomes a "word" that does
  // not wrap mid-word; whitespace itself is rendered as a spacer.
  const lines = state.rawText.split("\n");

  lines.forEach((line, li) => {
    // Walk char by char, grouping contiguous non-space chars into a .word.
    let currentWord = null;

    const flushWord = () => { currentWord = null; };

    for (const ch of line) {
      if (ch === " " || ch === "\t") {
        flushWord();
        continue;
      }
      if (!currentWord) {
        currentWord = document.createElement("span");
        currentWord.className = "word";
        display.appendChild(currentWord);
      }
      const idx = state.positions.length;
      state.positions.push(ch);
      currentWord.appendChild(makeCell(ch, idx));
    }

    if (li < lines.length - 1) {
      const brk = document.createElement("span");
      brk.className = "line-break";
      display.appendChild(brk);
    }
  });
}

function makeCell(ch, idx) {
  const letter = isLetter(ch);
  const hasGuess = state.mapping[ch] != null;

  const cell = document.createElement("span");
  cell.className = letter ? "cell" : "cell special";
  cell.dataset.char = ch;
  cell.dataset.index = idx;
  if (state.selected === ch) cell.classList.add("selected");
  if (state.cursor === idx) cell.classList.add("cursor");

  const guess = document.createElement("span");
  guess.className = "guess-char";
  // Letters default to blank; special characters default to themselves.
  // Either can be overridden with an explicit guess, and reset back to default.
  if (hasGuess) {
    guess.textContent = state.mapping[ch];
  } else if (letter) {
    guess.textContent = " ";
  } else {
    guess.textContent = ch;
    guess.classList.add("self-default");
  }

  const cipher = document.createElement("span");
  cipher.className = "cipher-char";
  cipher.textContent = ch;

  cell.append(guess, cipher);
  cell.addEventListener("click", () => selectAt(idx));
  return cell;
}

// ---------------------------------------------------------------------------
// Selection, navigation & substitution
// ---------------------------------------------------------------------------
// Select a specific cell by position (clicking). Clicking the active cell
// again clears the selection.
function selectAt(idx) {
  if (state.cursor === idx) {
    state.cursor = null;
    state.selected = null;
  } else {
    state.cursor = idx;
    state.selected = state.positions[idx];
  }
  renderCipher();
}

// Select by character value (Shift + letter), anchoring the cursor at the
// first occurrence so subsequent navigation continues from there.
function selectCharByValue(ch) {
  if (state.selected === ch) {
    state.selected = null;
    state.cursor = null;
  } else {
    state.selected = ch;
    const first = state.positions.indexOf(ch);
    state.cursor = first === -1 ? null : first;
  }
  renderCipher();
}

// Move the cursor to the next/previous letter cell, skipping spaces (which
// aren't cells) and special characters. Wraps around the ends.
function moveCursor(dir) {
  const n = state.positions.length;
  if (n === 0) return;
  let i = state.cursor;
  if (i == null) i = dir > 0 ? -1 : 0;
  for (let step = 0; step < n; step++) {
    i = (i + dir + n) % n;
    if (isLetter(state.positions[i])) {
      state.cursor = i;
      state.selected = state.positions[i];
      renderCipher();
      return;
    }
  }
}

function assignGuess(plain) {
  if (!state.selected) return;
  // Conflict clearing: a plaintext character may map from only one cipher
  // character. Drop any prior cipher char that already used this plaintext.
  for (const cipher of Object.keys(state.mapping)) {
    if (state.mapping[cipher] === plain && cipher !== state.selected) {
      delete state.mapping[cipher];
    }
  }
  state.mapping[state.selected] = plain;
  renderCipher();
}

function eraseGuess() {
  if (!state.selected) return;
  // Removing the override resets letters to blank and special chars to
  // themselves (their default).
  delete state.mapping[state.selected];
  renderCipher();
}

// ---------------------------------------------------------------------------
// Keyboard handling
// ---------------------------------------------------------------------------
function onKeyDown(e) {
  // Ignore keys while typing in the textarea / input view.
  if (els.solverView.classList.contains("hidden")) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "textarea" || tag === "input") return;

  const key = e.key;

  // Navigation: Tab / Right arrow → next letter, Shift+Tab / Left arrow → prev.
  if (key === "Tab" || key === "ArrowRight" || key === "ArrowLeft") {
    e.preventDefault();
    const forward = key === "ArrowRight" || (key === "Tab" && !e.shiftKey);
    moveCursor(forward ? 1 : -1);
    return;
  }

  // Shift + letter selects that cipher letter. (Special characters are
  // selected by clicking them, since they have no clean keyboard name.)
  if (e.shiftKey && key.length === 1 && /[a-zA-Z]/.test(key)) {
    e.preventDefault();
    selectCharByValue(key.toUpperCase());
    return;
  }

  // Erase keys: reset the selected cell to its default.
  if (key === " " || key === "Delete" || key === "Backspace") {
    if (state.selected) {
      e.preventDefault();
      eraseGuess();
    }
    return;
  }

  // Any other single printable character assigns a guess to the selected
  // cell — a letter, digit, or symbol (so special characters can be replaced).
  if (!e.metaKey && !e.ctrlKey && !e.altKey && key.length === 1) {
    if (state.selected) {
      e.preventDefault();
      const val = /[a-z]/i.test(key) ? key.toUpperCase() : key;
      assignGuess(val);
    }
  }
}

// ---------------------------------------------------------------------------
// Statistics engine
// ---------------------------------------------------------------------------
function computeStats(text) {
  // Contiguous runs of letters (n-grams never cross non-letters).
  const runs = (text.match(/[A-Z]+/g)) || [];

  const freq = {};
  for (let i = 0; i < 26; i++) freq[String.fromCharCode(65 + i)] = 0;
  let total = 0;

  const digraphs = {};
  const trigraphs = {};
  const doubles = {};
  const abas = {};

  for (const run of runs) {
    for (let i = 0; i < run.length; i++) {
      freq[run[i]]++;
      total++;
      if (i + 1 < run.length) {
        const d = run.substr(i, 2);
        digraphs[d] = (digraphs[d] || 0) + 1;
        if (run[i] === run[i + 1]) doubles[d] = (doubles[d] || 0) + 1;
      }
      if (i + 2 < run.length) {
        const t = run.substr(i, 3);
        trigraphs[t] = (trigraphs[t] || 0) + 1;
        if (run[i] === run[i + 2] && run[i] !== run[i + 1]) {
          abas[t] = (abas[t] || 0) + 1;
        }
      }
    }
  }

  // Reversals: pairs (AB, BA) both present, A !== B, counted once.
  const reversals = [];
  const seen = new Set();
  for (const d of Object.keys(digraphs)) {
    const rev = d[1] + d[0];
    if (d[0] !== d[1] && digraphs[rev] && !seen.has(rev)) {
      reversals.push({ pair: d + " / " + rev, a: digraphs[d], b: digraphs[rev] });
      seen.add(d);
    }
  }
  reversals.sort((x, y) => (y.a + y.b) - (x.a + x.b));

  const freqRows = Object.keys(freq)
    .map((l) => ({ letter: l, count: freq[l], pct: total ? (freq[l] / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));

  const recurring = (obj) =>
    Object.entries(obj)
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return {
    total,
    freqRows,
    digraphs: recurring(digraphs),
    trigraphs: recurring(trigraphs),
    doubles: Object.entries(doubles).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    abas: recurring(abas),
    reversals,
  };
}

// ---------------------------------------------------------------------------
// Rendering statistics
// ---------------------------------------------------------------------------
function renderStats(s) {
  els.stats.textContent = "";

  // Letter frequency (all 26).
  const maxCount = s.freqRows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  const freqBody = s.freqRows.map((r) => {
    const barW = (r.count / maxCount) * 60; // px
    return `<tr>
      <td class="gram">${r.letter}</td>
      <td class="num">${r.count}</td>
      <td class="num">${r.pct.toFixed(1)}%</td>
      <td><span class="bar" style="width:${barW.toFixed(1)}px"></span></td>
    </tr>`;
  }).join("");
  els.stats.appendChild(card(
    `Letter frequency <span class="empty-note">(${s.total} letters)</span>`,
    `<div class="freq-table"><table>
      <tr><th>Ltr</th><th class="num">#</th><th class="num">%</th><th></th></tr>
      ${freqBody}
    </table></div>`
  ));

  els.stats.appendChild(gramCard("Digraphs", s.digraphs, "recurring 2-letter sequences"));
  els.stats.appendChild(gramCard("Trigraphs", s.trigraphs, "recurring 3-letter sequences"));
  els.stats.appendChild(gramCard("Double letters", s.doubles, "adjacent identical letters"));
  els.stats.appendChild(gramCard("ABA patterns", s.abas, "e.g. QWQ"));

  // Reversals card (custom: two counts).
  let revInner;
  if (s.reversals.length === 0) {
    revInner = `<p class="empty-note">None found.</p>`;
  } else {
    const rows = s.reversals.map((r) =>
      `<tr><td class="gram">${r.pair}</td><td class="num">${r.a} / ${r.b}</td></tr>`
    ).join("");
    revInner = `<table><tr><th>Pair</th><th class="num">Counts</th></tr>${rows}</table>`;
  }
  els.stats.appendChild(card("Reversals <span class=\"empty-note\">(AB &amp; BA)</span>", revInner));
}

function card(title, innerHTML) {
  const div = document.createElement("div");
  div.className = "stat-card";
  div.innerHTML = `<h3>${title}</h3>${innerHTML}`;
  return div;
}

function gramCard(title, entries, note) {
  const heading = note ? `${title} <span class="empty-note">(${note})</span>` : title;
  let inner;
  if (!entries || entries.length === 0) {
    inner = `<p class="empty-note">None found.</p>`;
  } else {
    const rows = entries.map(([g, c]) =>
      `<tr><td class="gram">${g}</td><td class="num">${c}</td></tr>`
    ).join("");
    inner = `<table><tr><th>Seq</th><th class="num">#</th></tr>${rows}</table>`;
  }
  return card(heading, inner);
}

// ---------------------------------------------------------------------------
// Wire up
// ---------------------------------------------------------------------------
els.solveBtn.addEventListener("click", startSolving);
els.newPuzzleBtn.addEventListener("click", newPuzzle);
els.clearGuessesBtn.addEventListener("click", clearGuesses);
document.addEventListener("keydown", onKeyDown);
