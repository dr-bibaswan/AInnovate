const LEADERBOARD_SHEET_CSV =
    '[docs.google.com](https://docs.google.com/spreadsheets/d/1D4wv3Ub2FEWv-FDYYwlafgkPqlMOMkevbeRMLtdl3A8/export?format=csv&gid=882543959)';

document.addEventListener('DOMContentLoaded', loadLeaderboard);

async function loadLeaderboard() {
    const topTeamsTable = document.getElementById('topTeamsTable');
    const allIdeasTable = document.getElementById('allIdeasTable');

    try {
        if (!topTeamsTable || !allIdeasTable) {
            throw new Error('Leaderboard table elements were not found');
        }

        const response = await fetch(LEADERBOARD_SHEET_CSV, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Google Sheet request failed: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('CSV response:', csvText.slice(0, 500));

        const data = parseCSV(csvText);

        if (data.length < 2) {
            throw new Error('The sheet does not contain any data rows');
        }

        const headers = data[0].map(header =>
            header
                .replace(/^\uFEFF/, '')
                .trim()
                .toUpperCase()
        );

        console.log('Detected headers:', headers);

        const rows = data.slice(1).map(row => {
            const obj = {};

            headers.forEach((header, index) => {
                obj[header] = String(row[index] ?? '').trim();
            });

            return obj;
        });

        const validRows = rows.filter(row =>
            row['TEAM NAME'] ||
            row['TITLE OF THE IDEA'] ||
            row['FINAL SCORE']
        );

        console.log('Valid leaderboard rows:', validRows);

        if (!validRows.length) {
            throw new Error(
                `No valid rows found. Detected headers: ${headers.join(', ')}`
            );
        }

        populateTopTeams(validRows);
        populateHighlights(validRows);
        populateAllIdeas(validRows);
    } catch (error) {
        console.error('Leaderboard Error:', error);

        if (topTeamsTable) {
            topTeamsTable.innerHTML = `
                <tr>
                    <td colspan="3">${escapeHTML(error.message)}</td>
                </tr>
            `;
        }

        if (allIdeasTable) {
            allIdeasTable.innerHTML = `
                <tr>
                    <td colspan="4">${escapeHTML(error.message)}</td>
                </tr>
            `;
        }
    }
}

function parseCSV(csvText) {
    const rows = [];
    let row = [];
    let value = '';
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const character = csvText[i];
        const nextCharacter = csvText[i + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            value += '"';
            i++;
        } else if (character === '"') {
            insideQuotes = !insideQuotes;
        } else if (character === ',' && !insideQuotes) {
            row.push(value);
            value = '';
        } else if ((character === '\n' || character === '\r') && !insideQuotes) {
            if (character === '\r' && nextCharacter === '\n') {
                i++;
            }

            row.push(value);

            if (row.some(cell => cell.trim() !== '')) {
                rows.push(row);
            }

            row = [];
            value = '';
        } else {
            value += character;
        }
    }

    row.push(value);

    if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
    }

    return rows;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
