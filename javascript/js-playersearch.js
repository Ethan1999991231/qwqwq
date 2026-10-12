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

/**
 * 将 MiniMessage 的部分格式标签转换为真正的 HTML 样式。
 * 支持：
 * <gradient:#RRGGBB:#RRGGBB:...>
 * </gradient>
 * <bold>
 * </bold>
 *
 * 普通文本会进行 HTML 转义，防止注入 HTML。
 */
function renderMiniMessage(value) {
    const source = String(value ?? '');
    const tokenPattern = /<gradient:([^>]+)>|<\/gradient>|<bold>|<\/bold>/gi;

    let result = '';
    let lastIndex = 0;
    const stack = [];
    let match;

    while ((match = tokenPattern.exec(source)) !== null) {
        // 将格式标签之前的普通文本安全地转换为 HTML。
        result += escapeHTML(source.slice(lastIndex, match.index));
        lastIndex = match.index + match[0].length;

        // 处理渐变标签。
        if (match[1] !== undefined) {
            const colors = match[1].split(':');

            const validColors = colors.length >= 2 &&
                colors.every(color => /^#[0-9a-f]{6}$/i.test(color));

            if (validColors) {
                result += `<span style="background-image:linear-gradient(90deg,${colors.join(',')});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-weight:700">`;
                stack.push('gradient');
            } else {
                // 颜色格式不正确时，保留原始标签文本。
                result += escapeHTML(match[0]);
            }
        } else if (match[0].toLowerCase() === '<bold>') {
            // 处理粗体标签。
            result += '<strong>';
            stack.push('bold');
        } else {
            // 处理闭合标签。
            const closingTag = match[0].toLowerCase() === '</gradient>'
                ? 'gradient'
                : 'bold';

            if (stack[stack.length - 1] === closingTag) {
                stack.pop();
                result += closingTag === 'gradient'
                    ? '</span>'
                    : '</strong>';
            } else {
                // 没有匹配的开始标签时，不直接解释该标签。
                result += escapeHTML(match[0]);
            }
        }
    }

    // 处理最后一个标签之后剩余的文本。
    result += escapeHTML(source.slice(lastIndex));

    // 自动闭合未闭合的格式标签，避免生成不完整的 HTML。
    while (stack.length) {
        result += stack.pop() === 'gradient'
            ? '</span>'
            : '</strong>';
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

    if (playerMainArea) {
        playerMainArea.style.opacity = '0';
    }

    if (typeof showLoading === 'function') {
        showLoading('正在查询玩家信息...');
    }

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 35000);

    try {
        const response = await fetch('/api/v4/players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: [playerName]
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();
        const player = data?.[0];

        if (!player) {
            throw new Error('Player not found');
        }

        setText('name', player.name ?? '未知玩家');
        setText('uuid', `UUID: ${player.uuid ?? '—'}`);

        const avatar = document.getElementById('avatarImg');

        if (avatar && player.uuid) {
            const avatarId = encodeURIComponent(
                String(player.uuid).replace(/-/g, '')
            );

            let fallbackUsed = false;

            avatar.onerror = () => {
                if (!fallbackUsed) {
                    fallbackUsed = true;
                    avatar.src = '/avatar-backup/' + avatarId;
                    return;
                }

                avatar.onerror = null;
                avatar.alt = '玩家头像加载失败';

                avatar.src = 'data:image/svg+xml,' +
                    encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#e2e8f0"/><text x="64" y="84" text-anchor="middle" font-size="64" fill="#64748b">?</text></svg>'
                    );
            };

            avatar.src = '/avatar/' + avatarId;
        }

        const onlineText = document.getElementById('isOnline');
        const onlineDot = document.querySelector('#onlineBadge .dot');

        if (onlineText) {
            onlineText.textContent = player.status?.isOnline
                ? '在线'
                : '离线';

            onlineText.style.color = player.status?.isOnline
                ? '#22c55e'
                : '';
        }

        if (onlineDot) {
            onlineDot.className = `dot ${
                player.status?.isOnline ? 'online' : 'offline'
            }`;
        }

        setText('balance', formatBalance(player.stats?.balance));
        setText('numFriends', String(player.stats?.numFriends ?? 0));

        // 核心修改：把原始 MiniMessage 标签渲染为真实渐变和粗体。
        setHTML(
            'title',
            player.title ? renderMiniMessage(player.title) : '—'
        );

        setHTML('surName', escapeHTML(player.surname || '—'));
        setHTML('formattedName', escapeHTML(player.formattedName || '—'));
        setHTML('about', escapeHTML(player.about || '—'));

        setHTML('townJoined', linkTo('town', player.town?.name));
        setHTML('nationJoined', linkTo('nation', player.nation?.name));

        setText(
            'registered',
            formatDate(player.timestamps?.registered)
        );

        setText(
            'joinedTownAt
