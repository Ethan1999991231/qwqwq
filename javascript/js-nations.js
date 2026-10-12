const nationInput = document.getElementById('nationName');
const nationSearchButton = document.getElementById('searchButton');
const nationListButton = document.getElementById('listAll');
const nationTable = document.getElementById('nationList');
const nationTableBody = nationTable ? nationTable.querySelector('tbody') : null;

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
    if (!nationTableBody) return;
    nationTableBody.innerHTML = `<tr class="empty-row"><td colspan="2">${escapeHTML(message)}</td></tr>`;
    nationTable.style.display = 'table';
}

async function searchAll() {
    setButtonState(nationListButton, '正在获取列表...', true);
    if (typeof showLoading === 'function') showLoading('正在获取国家列表...');

    try {
        const response = await fetch('/api/v4/nations');
        const nations = await response.json();
        const list = Array.isArray(nations) ? nations.slice() : [];

        nationTableBody.innerHTML = '';

        if (!list.length) {
            renderEmptyTable('暂无国家数据');
            return;
        }

        list.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
        list.forEach(item => {
            const name = escapeHTML(item.name ?? '未知国家');
            const uuid = escapeHTML(item.uuid ?? '—');
            nationTableBody.insertAdjacentHTML(
                'beforeend',
                `<tr><td><a href="nation.html?search=${encodeURIComponent(item.name ?? '')}">${name}</a></td><td>${uuid}</td></tr>`
            );
        });

        nationTable.style.display = 'table';
    } catch (error) {
        console.error(error);
        renderEmptyTable('获取国家列表失败');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
        setButtonState(nationListButton, '获取全部国家列表');
    }
}

function search() {
    const nationName = nationInput ? nationInput.value.trim() : '';

    if (!nationName) {
        if (nationInput) {
            nationInput.classList.add('input-shake');
            setTimeout(() => nationInput.classList.remove('input-shake'), 180);
            nationInput.focus();
        }
        alert('请输入国家名称或 UUID');
        return;
    }

    setButtonState(nationSearchButton, '正在跳转...', true);
    setTimeout(() => {
        window.location.href = `nation.html?search=${encodeURIComponent(nationName)}`;
    }, 150);
}

if (nationInput) {
    nationInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            search();
        }
    });
}

setButtonState(nationSearchButton, '查询国家详情');
setButtonState(nationListButton, '获取全部国家列表');
