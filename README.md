# Cryptogram Solver

A self-contained, client-side web app for solving simple-substitution cryptograms,
with auto-generated statistical solving aids. No build step, no dependencies — just
open `index.html` in a browser.

## Features

- **Paste & solve** — drop in any simple-substitution cipher; spacing and punctuation
  are preserved (only letters are encoded).
- **Interactive substitution**
  - Click a character (or `Shift`+letter) to select it; all occurrences highlight.
  - Type a letter, digit, or symbol to fill your guess in above the cipher text — it
    auto-propagates to every occurrence of that character.
  - Reusing a plaintext letter automatically clears its previous assignment
    (conflict clearing).
  - `Tab` / `→` move to the next letter, `Shift`+`Tab` / `←` to the previous.
  - `Space` / `Delete` / `Backspace` resets a cell to its default.
  - Special characters default to showing themselves but can be replaced too.
- **Solving aids** (auto-generated per puzzle)
  - Letter frequency table (count + percentage for all 26 letters)
  - Recurring digraphs and trigraphs
  - Double letters, reversals (AB / BA), and ABA patterns
  - A linked reference page (`stats.html`) explaining how to use each clue.

## Usage

Open `index.html` in any modern browser, paste a cryptogram, and click
**"OK, let's decipher this thing!"**.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Input view + interactive solver view |
| `solver.js`  | State, rendering, keyboard/click handling, statistics engine |
| `styles.css` | Shared styling |
| `stats.html` | Reference page explaining the solving aids |
