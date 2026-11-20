// API Key 入口页：验证一次，key 只存在本次访问的 sessionStorage 里
(function () {
    'use strict';

    var STORAGE_KEY = 'earthmc_api_key';
    var DEFAULT_NEXT = 'index.html';

    var form = document.getElementById('keyForm');
    var input = document.getElementById('apiKeyInput');
    var toggle = document.getElementById('keyToggle');
    var submit = document.getElementById('keySubmit');
    var statusEl = document.getElementById('keyStatus');

    if (!form || !input) return;

    var params = new URLSearchParams(window.location.search);
    var next = safeNext(params.get('next'));

    function safeNext(value) {
        if (!value) return DEFAULT_NEXT;
        if (!/\.html(?:[?#].*)?$/.test(value)) return DEFAULT_NEXT;
        if (/^[a-z]+:/i.test(value) || value.indexOf('//') === 0) return DEFAULT_NEXT;
        var clean = value.replace(/^\/+/, '');
        if (clean.indexOf('..') !== -1 || clean.charAt(0) === '/') return DEFAULT_NEXT;
        return clean;
    }

    function readKey() {
        try { return window.sessionStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
    }

    function saveKey(key) {
        try { window.sessionStorage.setItem(STORAGE_KEY, key); return true; } catch (e) { return false; }
    }

    function clearKey() {
        try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.className = kind || '';
    }

    function maskKey(key) {
        if (key.length <= 10) return key;
        return '已记录本次访问的 Key：' + key.slice(0, 4) + '…' + key.slice(-4);
    }

    async function verifyKey(key) {
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
        try {
            var response = await fetch('/api/v4', {
                headers: { 'Authorization': 'Bearer ' + key },
                cache: 'no-store',
                signal: controller ? controller.signal : undefined
            });
            var body = '';
            try { body = await response.text(); } catch (e) {}
            return { status: response.status, body: body, retryAfter: response.headers.get('Retry-After') };
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    var existing = readKey();
    if (existing) {
        input.value = existing;
        setStatus(maskKey(existing) + '，点“验证并进入”继续。', 'ok');
    }
    if (params.get('reason') === 'expired') {
        clearKey();
        input.value = '';
        setStatus('上次用的 Key 已失效（401），请重新填写。', 'error');
    }

    toggle.addEventListener('click', function () {
        var hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        toggle.textContent = hidden ? '隐藏' : '显示';
        input.focus();
    });

    var autoRetries = 0;
    function countdownThenRetry(seconds) {
        return new Promise(function (resolve) {
            var left = seconds;
            input.disabled = true;
            toggle.disabled = true;
            var tick = function () {
                if (left <= 0) {
                    input.disabled = false;
                    toggle.disabled = false;
                    resolve(true);
                    return;
                }
                setStatus('上游限流了：EarthMC 每分钟只放 180 次请求，' + left + ' 秒后自动重试。', 'error');
                left -= 1;
                setTimeout(tick, 1000);
            };
            tick();
        });
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var key = input.value.trim().replace(/^Bearer\s+/i, '');
        if (!key) {
            setStatus('先把 Key 贴上。', 'error');
            input.focus();
            return;
        }

        submit.disabled = true;
        setStatus('正在验证 Key…');
        var done = false;

        try {
            var result = await verifyKey(key);
            if (result.status >= 200 && result.status < 300) {
                if (!saveKey(key)) {
                    setStatus('浏览器不允许保存会话数据，请允许本站使用网站数据后重试。', 'error');
                    return;
                }
                done = true;
                setStatus('验证通过，正在进入…', 'ok');
                window.location.replace(next);
                return;
            }
            if (result.status === 429) {
                var waitSeconds = parseInt(result.retryAfter, 10);
                if (!(waitSeconds > 0)) waitSeconds = 20;
                if (waitSeconds > 90) waitSeconds = 90;
                if (autoRetries < 3) {
                    autoRetries += 1;
                    await countdownThenRetry(waitSeconds);
                    if (form.requestSubmit) form.requestSubmit(); else submit.click();
                } else {
                    setStatus('上游限流还没过去，过一两分钟再点一次。', 'error');
                }
                return;
            }
            if (result.status === 401) {
                clearKey();
                var text = String(result.body || '');
                if (/owner/i.test(text)) {
                    setStatus('这个 Key 上游认不出主人，可能填错了或已经被重置。', 'error');
                } else if (/No API key/i.test(text)) {
                    setStatus('请求没带上 Key，再试一次。', 'error');
                } else {
                    setStatus('Key 无效或已失效（401），请检查后重新填写。', 'error');
                }
                return;
            }
            setStatus('验证失败：接口返回 ' + result.status + '，稍后再试。', 'error');
        } catch (error) {
            setStatus('连不上接口（' + (error && error.message ? error.message : '网络错误') + '），检查网络后重试。', 'error');
        } finally {
            if (!done) submit.disabled = false;
        }
    });

    input.focus();
})();
