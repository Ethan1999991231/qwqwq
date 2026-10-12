const playerInput = document.getElementById('pName');
const searchButton = document.getElementById('searchButton');

function setSearchButtonState(text, disabled = false) {
    if (!searchButton) return;
    searchButton.textContent = text;
    searchButton.disabled = disabled;
    searchButton.classList.toggle('searching', disabled);
}

function search() {
    const playerName = playerInput ? playerInput.value.trim() : '';

    if (!playerName) {
        if (playerInput) {
            playerInput.classList.add('input-shake');
            setTimeout(() => playerInput.classList.remove('input-shake'), 180);
            playerInput.focus();
        }
        alert('请输入玩家名称或 UUID');
        return;
    }

    setSearchButtonState('正在跳转...', true);
    setTimeout(() => {
        window.location.href = `player.html?search=${encodeURIComponent(playerName)}`;
    }, 150);
}

if (playerInput) {
    playerInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            search();
        }
    });
}

setSearchButtonState('查询玩家详情');
