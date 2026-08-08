const IDEAS_SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1D4wv3Ub2FEWv-FDYYwlafgkPqlMOMkevbeRMLtdl3A8/gviz/tq?tqx=out:csv&gid=882543959';

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(v => v !== '')) rows.push(row); }
  return rows;
}
function normalize(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function findColumn(headers, candidates) {
  const normalized = headers.map(normalize);
  const wanted = candidates.map(normalize);

  // First: exact match
  for (const candidate of wanted) {
    const i = normalized.indexOf(candidate);
    if (i !== -1) return i;
  }

  // Second: flexible match (handles punctuation, extra words, etc.)
  for (let i = 0; i < normalized.length; i++) {
    if (wanted.some(candidate =>
      normalized[i].includes(candidate) || candidate.includes(normalized[i])
    )) return i;
  }
  return -1;
}
async function loadIdeas() {
  const status = document.getElementById('ideasStatus');
  const body = document.querySelector('#ideasTable tbody');
  try {
    const response = await fetch(IDEAS_SHEET_CSV + '&_=' + Date.now(), {
      cache: 'no-store',
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('Unable to read the Google Sheet (HTTP ' + response.status + ').');
    const rows = parseCSV(await response.text());
    if (rows.length < 2) throw new Error('No idea submissions found in the selected Google Sheet tab.');
    const headers = rows[0];
    const team = findColumn(headers, ['team name', 'team', 'name of team']);
    const title = findColumn(headers, ['title of the idea', 'title of idea', 'idea title', 'title', 'idea']);
    const useCase = findColumn(headers, ['use case-inspiration', 'use case of inspiration', 'use case inspiration', 'use case', 'category']);
    if ([team, title, useCase].includes(-1)) throw new Error('Please check the Google Sheet column headings.');
    body.innerHTML = rows.slice(1).filter(r => r.some(Boolean)).map(r => `<tr><td>${escapeHTML(r[team])}</td><td>${escapeHTML(r[title])}</td><td>${escapeHTML(r[useCase])}</td></tr>`).join('');
    status.textContent = `${body.children.length} ideas loaded from Google Sheets.`;
  } catch (error) { status.textContent = error.message; }
}
function escapeHTML(value) { const d = document.createElement('div'); d.textContent = value || '—'; return d.innerHTML; }
loadIdeas();
