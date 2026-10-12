const nationQueryInput = document.getElementById('nName');
const nationQueryButton = document.getElementById('searchButton');
const nationMainArea = document.getElementById('mainArea');
const nationNameParam = new URLSearchParams(window.location.search).get('search')?.trim() || '';

if (nationQueryInput) {
    nationQueryInput.value = nationNameParam;
    nationQueryInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            search();
        }
    });
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function setSearchButton(text, disabled = false) {
    if (!nationQueryButton) return;
    nationQueryButton.textContent = text;
    nationQueryButton.disabled = disabled;
}

function boolHTML(value) {
    return `<span class="${value ? 'yes' : 'no'}">${value ? '是' : '否'}</span>`;
}

function formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatBalance(value) {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return `${Number(value).toLocaleString('en-US')} 金锭`;
}

function linkTo(type, name) {
    if (!name) return '无';
    const href = `${type}.html?search=${encodeURIComponent(name)}`;
    return `<a href="${href}">${escapeHTML(name)}</a>`;
}

function setHTML(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = value;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setCardAccent() {
    const icon = document.getElementById('cardIcon');
    if (!icon) return;
    icon.style.background = 'rgba(6, 182, 212, 0.16)';
    icon.style.border = '2px solid rgba(6, 182, 212, 0.62)';
    icon.style.color = '#a5f3fc';
}

function revealMainArea() {
    if (!nationMainArea) return;
    nationMainArea.style.opacity = '1';
    nationMainArea.classList.add('fade-in');
}

function renderTable(tableSelector, rows, type, emptyText) {
    const tableBody = document.querySelector(`${tableSelector} tbody`);
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!rows.length) {
        tableBody.innerHTML = `<tr class="empty-row"><td colspan="2">${escapeHTML(emptyText)}</td></tr>`;
        return;
    }

    rows.forEach(row => {
        tableBody.insertAdjacentHTML(
            'beforeend',
            `<tr><td>${linkTo(type, row.name)}</td><td>${escapeHTML(row.uuid ?? '—')}</td></tr>`
        );
    });
}

async function loadNation(nationName) {
    setCardAccent();

    if (!nationName) {
        revealMainArea();
        setSearchButton('查询国家信息');
        return;
    }

    setSearchButton('正在查询...', true);
    if (nationMainArea) nationMainArea.style.opacity = '0';
    if (typeof showLoading === 'function') showLoading('正在查询国家信息...');

    try {
        const response = await fetch('/api/v4/nations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: [nationName] })
        });
        const data = await response.json();
        const nation = data?.[0];

        if (!nation) throw new Error('Nation not found');

        setText('name', nation.name ?? '未知国家');
        setText('uuid', `UUID: ${nation.uuid ?? '—'}`);

        const colorSwatch = document.getElementById('dynmapColour');
        if (colorSwatch) {
            colorSwatch.style.backgroundColor = nation.dynmapColour ? `#${nation.dynmapColour}` : 'transparent';
            colorSwatch.style.borderColor = nation.dynmapOutline ? `#${nation.dynmapOutline}` : 'rgba(255,255,255,0.3)';
        }

        setHTML('king', `${linkTo('player', nation.king?.name)} · 国王`);
        setText('numTowns', String(nation.stats?.numTowns ?? 0));
        setText('numResidents', String(nation.stats?.numResidents ?? 0));
        setText('numTownBlocks', String(nation.stats?.numTownBlocks ?? 0));

        const boardText = document.getElementById('boardText');
        if (boardText) boardText.value = nation.board || '（无公告）';

        setHTML('kingRow', linkTo('player', nation.king?.name));
        setHTML('capital', linkTo('town', nation.capital?.name));
        setText('registered', formatDate(nation.timestamps?.registered));
        setHTML('wiki', nation.wiki ? `<a href="${escapeHTML(nation.wiki)}" target="_blank" rel="noreferrer">${escapeHTML(nation.wiki)}</a>` : '—');

        setHTML('isPublic', boolHTML(Boolean(nation.status?.isPublic)));
        setHTML('isOpen', boolHTML(Boolean(nation.status?.isOpen)));
        setHTML('isNeutral', boolHTML(Boolean(nation.status?.isNeutral)));

        setText('numTownBlocksDetail', String(nation.stats?.numTownBlocks ?? 0));
        setText('numResidentsDetail', String(nation.stats?.numResidents ?? 0));
        setText('numAllies', String(nation.stats?.numAllies ?? 0));
        setText('numEnemies', String(nation.stats?.numEnemies ?? 0));
        setText('balance', formatBalance(nation.stats?.balance));

        const spawnX = Math.floor(Number(nation.coordinates?.spawn?.x ?? 0));
        const spawnY = Math.floor(Number(nation.coordinates?.spawn?.y ?? 0));
        const spawnZ = Math.floor(Number(nation.coordinates?.spawn?.z ?? 0));
        setText('spawn-x', String(spawnX));
        setText('spawn-y', String(spawnY));
        setText('spawn-z', String(spawnZ));

        const mapLink = document.getElementById('mapLink');
        if (mapLink) {
            mapLink.href = `https://map.earthmc.net/?world=minecraft_overworld&zoom=5&x=${spawnX}&z=${spawnZ}`;
        }

        ['Chancellor', 'Colonist', 'Diplomat'].forEach(rankId => {
            const values = nation.ranks?.[rankId];
            setText(rankId, Array.isArray(values) && values.length ? values.join(', ') : '无');
        });

        renderTable('#townsTable', Array.isArray(nation.towns) ? nation.towns : [], 'town', '暂无所属城镇');
        renderTable('#alliesTable', Array.isArray(nation.allies) ? nation.allies : [], 'nation', '暂无盟友');
        renderTable('#enemiesTable', Array.isArray(nation.enemies) ? nation.enemies : [], 'nation', '暂无敌国');

        revealMainArea();
    } catch (error) {
        console.error(error);
        alert('没有查询到该国家信息');
        revealMainArea();
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
        setSearchButton('查询国家信息');
    }
}

function search() {
    const nationName = nationQueryInput ? nationQueryInput.value.trim() : '';

    if (!nationName) {
        if (nationQueryInput) {
            nationQueryInput.classList.add('input-shake');
            setTimeout(() => nationQueryInput.classList.remove('input-shake'), 180);
            nationQueryInput.focus();
        }
        alert('请输入国家名称或 UUID');
        return;
    }

    setSearchButton('正在跳转...', true);
    setTimeout(() => {
        window.location.href = `nation.html?search=${encodeURIComponent(nationName)}`;
    }, 150);
}

loadNation(nationNameParam);
