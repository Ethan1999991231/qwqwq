const playerQueryInput = document.getElementById('pName');
const playerQueryButton = document.getElementById('searchButton');
const playerMainArea = document.getElementById('mainArea');
const playerNameParam = new URLSearchParams(window.location.search).get('search')?.trim() || '';

if (playerQueryInput) {
    playerQueryInput.value = playerNameParam;
    playerQueryInput.addEventListener('keydown', event => {
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
    if (!playerQueryButton) return;
    playerQueryButton.textContent = text;
    playerQueryButton.disabled = disabled;
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

const miniMessageColors = {
    black: '#000000',
    dark_blue: '#0000aa',
    dark_green: '#00aa00',
    dark_aqua: '#00aaaa',
    dark_red: '#aa0000',
    dark_purple: '#aa00aa',
    gold: '#ffaa00',
    gray: '#aaaaaa',
    dark_gray: '#555555',
    blue: '#5555ff',
    green: '#55ff55',
    aqua: '#55ffff',
    red: '#ff5555',
    light_purple: '#ff55ff',
    yellow: '#ffff55',
    white: '#ffffff'
};

function closeMiniMessageTag(tagName) {
    return tagName === 'color' || tagName === 'gradient'
        ? '</span>'
        : '</strong>';
}

function closeMiniMessageStack(stack, tagName) {
    const index = stack.lastIndexOf(tagName);

    if (index === -1) return '';

    let html = '';

    while (stack.length > index) {
        html += closeMiniMessageTag(stack.pop());
    }

    return html;
}

function normalizeMiniMessageSource(value) {
    return String(value ?? '')
        .replace(/\\(?=<\/?[^>]+>)/g, '')
        .replace(/&lt;|&#60;|&#x3c;/gi, '<')
        .replace(/&gt;|&#62;|&#x3e;/gi, '>')
        .replace(/&quot;|&#34;|&#x22;/gi, '"')
        .replace(/&#39;|&#x27;/gi, "'")
        .replace(/&amp;/gi, '&');
}

/**
 * 将 MiniMessage 的常用格式标签转换成安全 HTML。
 * 支持渐变、Minecraft 命名颜色、<#RRGGBB>、<bold> 和 <b>。
 */
function renderMiniMessage(value) {
    const source = normalizeMiniMessageSource(value);
    const tokenPattern = /<[^>]+>/g;

    let result = '';
    let lastIndex = 0;
    const stack = [];
    let match;

    while ((match = tokenPattern.exec(source)) !== null) {
        result += escapeHTML(source.slice(lastIndex, match.index));
        lastIndex = match.index + match[0].length;

        const rawTag = match[0].slice(1, -1).trim();
        const tag = rawTag.toLowerCase();

        if (tag.startsWith('gradient:')) {
            const colors = rawTag.slice('gradient:'.length).split(':');
            const validColors = colors.length >= 2 &&
                colors.every(color => /^#[0-9a-f]{6}$/i.test(color));

            if (!validColors) {
                result += escapeHTML(match[0]);
                continue;
            }

            result += `<span style="background-image:linear-gradient(90deg,${colors.join(',')});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-weight:700">`;
            stack.push('gradient');
            continue;
        }

        if (tag === 'bold' || tag === 'b') {
            result += '<strong>';
            stack.push('bold');
            continue;
        }

        if (/^#[0-9a-f]{6}$/i.test(tag)) {
            result += `<span style="color:${tag};-webkit-text-fill-color:${tag}">`;
            stack.push('color');
            continue;
        }

        if (miniMessageColors[tag]) {
            result += `<span style="color:${miniMessageColors[tag]};-webkit-text-fill-color:${miniMessageColors[tag]}">`;
            stack.push('color');
            continue;
        }

        const closingTag = tag.startsWith('/') ? tag.slice(1) : '';
        if (closingTag === 'gradient' || closingTag === 'bold' || closingTag === 'b') {
            const expected = closingTag === 'gradient' ? 'gradient' : 'bold';
            result += closeMiniMessageStack(stack, expected) || escapeHTML(match[0]);
            continue;
        }

        if (closingTag === 'color' || /^#[0-9a-f]{6}$/i.test(closingTag) || miniMessageColors[closingTag]) {
            result += closeMiniMessageStack(stack, 'color') || escapeHTML(match[0]);
            continue;
        }

        if (tag === 'reset') {
            while (stack.length) {
                result += closeMiniMessageTag(stack.pop());
            }
            continue;
        }

        result += escapeHTML(match[0]);
    }

    result += escapeHTML(source.slice(lastIndex));

    while (stack.length) {
        result += closeMiniMessageTag(stack.pop());
    }

    return result;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function revealMainArea() {
    if (!playerMainArea) return;
    playerMainArea.style.opacity = '1';
    playerMainArea.classList.add('fade-in');
}

function renderFriendsTable(friends) {
    const tableBody = document.querySelector('#friendsList tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!friends.length) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="2">暂无好友</td></tr>';
        return;
    }

    friends.forEach(friend => {
        tableBody.insertAdjacentHTML(
            'beforeend',
            `<tr><td>${linkTo('player', friend.name)}</td><td>${escapeHTML(friend.uuid ?? '—')}</td></tr>`
        );
    });
}

async function loadPlayer(playerName) {
    if (!playerName) {
        revealMainArea();
        setSearchButton('查询玩家信息');
        return;
    }

    setSearchButton('正在查询...', true);
    if (playerMainArea) playerMainArea.style.opacity = '0';
    if (typeof showLoading === 'function') showLoading('正在查询玩家信息...');

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 35000);
    try {
        const response = await fetch('/api/v4/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: [playerName] }),
            signal: controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const player = data?.[0];

        if (!player) throw new Error('Player not found');

        setText('name', player.name ?? '未知玩家');
        setText('uuid', `UUID: ${player.uuid ?? '—'}`);

        const avatar = document.getElementById('avatarImg');
        if (avatar && player.uuid) {
            const avatarId = encodeURIComponent(String(player.uuid).replace(/-/g, ''));
            let fallbackUsed = false;
            avatar.onerror = () => {
                if (!fallbackUsed) {
                    fallbackUsed = true;
                    avatar.src = '/avatar-backup/' + avatarId;
                    return;
                }
                avatar.onerror = null;
                avatar.alt = '玩家头像加载失败';
                avatar.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#e2e8f0"/><text x="64" y="84" text-anchor="middle" font-size="64" fill="#64748b">?</text></svg>');
            };
            avatar.src = '/avatar/' + avatarId;
        }

        const onlineText = document.getElementById('isOnline');
        const onlineDot = document.querySelector('#onlineBadge .dot');
        if (onlineText) {
            onlineText.textContent = player.status?.isOnline ? '在线' : '离线';
            onlineText.style.color = player.status?.isOnline ? '#22c55e' : '';
        }
        if (onlineDot) {
            onlineDot.className = `dot ${player.status?.isOnline ? 'online' : 'offline'}`;
        }

        setText('balance', formatBalance(player.stats?.balance));
        setText('numFriends', String(player.stats?.numFriends ?? 0));
        setHTML('title', player.title ? renderMiniMessage(player.title) : '—');

        setHTML('surName', player.surname ? renderMiniMessage(player.surname) : '—');
        setHTML('formattedName', player.formattedName ? renderMiniMessage(player.formattedName) : '—');
        setHTML('about', player.about ? renderMiniMessage(player.about) : '—');
        setHTML('townJoined', linkTo('town', player.town?.name));
        setHTML('nationJoined', linkTo('nation', player.nation?.name));

        setText('registered', formatDate(player.timestamps?.registered));
        setText('joinedTownAt', formatDate(player.timestamps?.joinedTownAt));

        const lastOnlineEl = document.getElementById('lastOnline');
        if (lastOnlineEl) {
            lastOnlineEl.textContent = player.status?.isOnline ? '当前在线' : formatDate(player.timestamps?.lastOnline);
            lastOnlineEl.className = `value ${player.status?.isOnline ? 'online-val' : ''}`.trim();
        }

        setHTML('isNPC', boolHTML(Boolean(player.status?.isNPC)));
        setHTML('isMayor', boolHTML(Boolean(player.status?.isMayor)));
        setHTML('isKing', boolHTML(Boolean(player.status?.isKing), 'gold', 'no'));

        setText('townRanks', player.ranks?.townRanks?.length ? player.ranks.townRanks.join(', ') : '无');
        setText('nationRanks', player.ranks?.nationRanks?.length ? player.ranks.nationRanks.join(', ') : '无');

        renderFriendsTable(Array.isArray(player.friends) ? player.friends : []);
        revealMainArea();
    } catch (error) {
        console.error(error);
        alert(error.message === 'Player not found' ? '没有查询到该玩家信息' : '查询失败，请检查网络或反代服务后重试');
        revealMainArea();
    } finally {
        clearTimeout(requestTimeout);
        if (typeof hideLoading === 'function') hideLoading();
        setSearchButton('查询玩家信息');
    }
}

function search() {
    const playerName = playerQueryInput ? playerQueryInput.value.trim() : '';

    if (!playerName) {
        if (playerQueryInput) {
            playerQueryInput.classList.add('input-shake');
            setTimeout(() => playerQueryInput.classList.remove('input-shake'), 180);
            playerQueryInput.focus();
        }
        alert('请输入玩家名称或 UUID');
        return;
    }

    setSearchButton('正在跳转...', true);
    setTimeout(() => {
        window.location.href = `player.html?search=${encodeURIComponent(playerName)}`;
    }, 150);
}

loadPlayer(playerNameParam);
