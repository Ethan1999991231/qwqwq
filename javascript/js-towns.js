const townInput = document.getElementById('townName');
const townSearchButton = document.getElementById('searchButton');
const townListButton = document.getElementById('listAll');
const townTable = document.getElementById('townList');
const townTableBody = townTable ? townTable.querySelector('tbody') : null;

function setButtonState(button, text, disabled = false) {
    if (!button) return;
    button.textContent = text;
    button.disabled = disabled;
    button.classList.toggle('searching', disabled);
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

function renderEmptyTable(message) {
    if (!townTableBody) return;
    townTableBody.innerHTML = `<tr class="empty-row"><td colspan="2">${escapeHTML(message)}</td></tr>`;
    townTable.style.display = 'table';
}

async function searchAll() {
    setButtonState(townListButton, '正在获取列表...', true);
    if (typeof showLoading === 'function') showLoading('正在获取城镇列表...');

    try {
        const response = await fetch('/api/v4/towns');
        const towns = await response.json();
        const list = Array.isArray(towns) ? towns.slice() : [];

        townTableBody.innerHTML = '';

        if (!list.length) {
            renderEmptyTable('暂无城镇数据');
            return;
        }

        list.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
        list.forEach(item => {
            const name = escapeHTML(item.name ?? '未知城镇');
            const uuid = escapeHTML(item.uuid ?? '—');
            townTableBody.insertAdjacentHTML(
                'beforeend',
                `<tr><td><a href="town.html?search=${encodeURIComponent(item.name ?? '')}">${name}</a></td><td>${uuid}</td></tr>`
            );
        });

        townTable.style.display = 'table';
    } catch (error) {
        console.error(error);
        renderEmptyTable('获取城镇列表失败');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
        setButtonState(townListButton, '获取全部城镇列表');
    }
}

function search() {
    const townName = townInput ? townInput.value.trim() : '';

    if (!townName) {
        if (townInput) {
            townInput.classList.add('input-shake');
            setTimeout(() => townInput.classList.remove('input-shake'), 180);
            townInput.focus();
        }
        alert('请输入城镇名称或 UUID');
        return;
    }

    setButtonState(townSearchButton, '正在跳转...', true);
    setTimeout(() => {
        window.location.href = `town.html?search=${encodeURIComponent(townName)}`;
    }, 150);
}

if (townInput) {
    townInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            search();
        }
    });
}

setButtonState(townSearchButton, '查询城镇详情');
setButtonState(townListButton, '获取全部城镇列表');
