const townQueryInput = document.getElementById('tName');
const townQueryButton = document.getElementById('searchButton');
const townMainArea = document.getElementById('mainArea');
const townNameParam = new URLSearchParams(window.location.search).get('search')?.trim() || '';

if (townQueryInput) {
    townQueryInput.value = townNameParam;
    townQueryInput.addEventListener('keydown', event => {
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
    if (!townQueryButton) return;
    townQueryButton.textContent = text;
    townQueryButton.disabled = disabled;
}

function boolHTML(value, yesClass = 'yes', noClass = 'no') {
    return `<span class="${value ? yesClass : noClass}">${value ? '是' : '否'}</span>`;
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
    icon.style.background = 'rgba(99, 102, 241, 0.16)';
    icon.style.border = '2px solid rgba(99, 102, 241, 0.62)';
    icon.style.color = '#c7d2fe';
}

function revealMainArea() {
    if (!townMainArea) return;
    townMainArea.style.opacity = '1';
    townMainArea.classList.add('fade-in');
}

function setFlag(id, enabled) {
    const element = document.getElementById(id);
    if (!element) return;
    element.className = `flag-status ${enabled ? 'yes' : 'no'}`;
    element.textContent = enabled ? '开' : '关';
}

function renderResidents(residents) {
    const tableBody = document.querySelector('#residentsTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!residents.length) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="2">暂无居民</td></tr>';
        return;
    }

    residents.forEach(resident => {
        tableBody.insertAdjacentHTML(
            'beforeend',
            `<tr><td>${linkTo('player', resident.name)}</td><td>${escapeHTML(resident.uuid ?? '—')}</td></tr>`
        );
    });
}

async function loadTown(townName) {
    setCardAccent();

    if (!townName) {
        revealMainArea();
        setSearchButton('查询城镇信息');
        return;
    }

    setSearchButton('正在查询...', true);
    if (townMainArea) townMainArea.style.opacity = '0';
    if (typeof showLoading === 'function') showLoading('正在查询城镇信息...');

    try {
        const response = await fetch('/api/v4/towns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: [townName] })
        });
        const data = await response.json();
        const town = data?.[0];

        if (!town) throw new Error('Town not found');

        setText('name', town.name ?? '未知城镇');
        setText('uuid', `UUID: ${town.uuid ?? '—'}`);

        const publicDot = document.getElementById('isPublicDot');
        const publicLabel = document.getElementById('isPublicLabel');
        if (publicDot) {
            publicDot.className = `online-dot ${town.status?.isPublic ? 'public' : 'private'}`;
        }
        if (publicLabel) {
            publicLabel.textContent = town.status?.isPublic ? '公开城镇' : '私有城镇';
        }

        const blocks = Number(town.stats?.numTownBlocks ?? 0);
        const maxBlocks = Number(town.stats?.maxTownBlocks ?? 0);
        setHTML('numTownBlocks', `${blocks}<small style="font-size:0.72em;color:var(--text-muted)"> / ${maxBlocks}</small>`);
        setText('numResidents', String(town.stats?.numResidents ?? 0));
        setText('balance', formatBalance(town.stats?.balance));

        const boardText = document.getElementById('boardText');
        if (boardText) boardText.value = town.board || '（无公告）';

        setHTML('founder', linkTo('player', town.founder));
        setHTML('mayor', linkTo('player', town.mayor?.name));
        setHTML('nation', linkTo('nation', town.nation?.name));
        setText('registered', formatDate(town.timestamps?.registered));
        setText('joinedNationAt', formatDate(town.timestamps?.joinedNationAt));
        setHTML('wiki', town.wiki ? `<a href="${escapeHTML(town.wiki)}" target="_blank" rel="noreferrer">${escapeHTML(town.wiki)}</a>` : '—');

        const ruinedAtRow = document.getElementById('ruinedAtRow');
        if (town.timestamps?.ruinedAt) {
            if (ruinedAtRow) ruinedAtRow.style.display = '';
            setText('ruinedAt', formatDate(town.timestamps.ruinedAt));
        } else if (ruinedAtRow) {
            ruinedAtRow.style.display = 'none';
        }

        setHTML('isPublic', boolHTML(Boolean(town.status?.isPublic)));
        setHTML('isOpen', boolHTML(Boolean(town.status?.isOpen)));
        setHTML('isNeutral', boolHTML(Boolean(town.status?.isNeutral)));
        setHTML('Capital', boolHTML(Boolean(town.status?.isCapital)));
        setHTML('isOverClaimed', boolHTML(Boolean(town.status?.isOverClaimed)));
        setHTML('hasOverclaimShield', boolHTML(Boolean(town.status?.hasOverclaimShield)));
        setHTML('isRuined', boolHTML(Boolean(town.status?.isRuined)));
        setHTML('isForSale', boolHTML(Boolean(town.status?.isForSale)));
        setHTML('hasNation', boolHTML(Boolean(town.status?.hasNation)));
        setHTML('canOutsidersSpawn', boolHTML(Boolean(town.status?.canOutsidersSpawn)));

        const forSalePriceRow = document.getElementById('forSalePriceRow');
        if (town.stats?.forSalePrice == null) {
            if (forSalePriceRow) forSalePriceRow.style.display = 'none';
        } else {
            if (forSalePriceRow) forSalePriceRow.style.display = '';
            setHTML('forSalePrice', `<span class="yes">${formatBalance(town.stats.forSalePrice)}</span>`);
        }

        setText('numTownBlocksDetail', String(town.stats?.numTownBlocks ?? 0));
        setText('maxTownBlocks', String(town.stats?.maxTownBlocks ?? 0));
        setText('numResidentsDetail', String(town.stats?.numResidents ?? 0));
        setText('numTrusted', String(town.stats?.numTrusted ?? 0));
        setText('numOutlaws', String(town.stats?.numOutlaws ?? 0));

        setFlag('pvp', Boolean(town.perms?.flags?.pvp));
        setFlag('explosion', Boolean(town.perms?.flags?.explosion));
        setFlag('fire', Boolean(town.perms?.flags?.fire));
        setFlag('mobs', Boolean(town.perms?.flags?.mobs));

        const spawnX = Math.floor(Number(town.coordinates?.spawn?.x ?? 0));
        const spawnY = Math.floor(Number(town.coordinates?.spawn?.y ?? 0));
        const spawnZ = Math.floor(Number(town.coordinates?.spawn?.z ?? 0));
        setText('spawn-x', String(spawnX));
        setText('spawn-y', String(spawnY));
        setText('spawn-z', String(spawnZ));
        setText('homeBlock', Array.isArray(town.coordinates?.homeBlock) ? `(${town.coordinates.homeBlock[0]}, ${town.coordinates.homeBlock[1]})` : '—');

        const mapLink = document.getElementById('mapLink');
        if (mapLink) {
            mapLink.href = `https://map.earthmc.net/?world=minecraft_overworld&zoom=5&x=${spawnX}&z=${spawnZ}`;
        }

        const rankIds = ['Councillor', 'Builder', 'Recruiter', 'Police', 'Tax-exempt', 'Treasurer', 'Realtor', 'Settler'];
        rankIds.forEach(rankId => {
            const values = town.ranks?.[rankId];
            setText(rankId, Array.isArray(values) && values.length ? values.join(', ') : '无');
        });

        renderResidents(Array.isArray(town.residents) ? town.residents : []);
        revealMainArea();
    } catch (error) {
        console.error(error);
        alert('没有查询到该城镇信息');
        revealMainArea();
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
        setSearchButton('查询城镇信息');
    }
}

function search() {
    const townName = townQueryInput ? townQueryInput.value.trim() : '';

    if (!townName) {
        if (townQueryInput) {
            townQueryInput.classList.add('input-shake');
            setTimeout(() => townQueryInput.classList.remove('input-shake'), 180);
            townQueryInput.focus();
        }
        alert('请输入城镇名称或 UUID');
        return;
    }

    setSearchButton('正在跳转...', true);
    setTimeout(() => {
        window.location.href = `town.html?search=${encodeURIComponent(townName)}`;
    }, 150);
}

loadTown(townNameParam);
