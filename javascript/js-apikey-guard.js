// 每个查询页都先加载这个：没 Key 就回入口页，有 Key 就给 /api/ 请求自动加 Authorization
(function () {
    'use strict';

    var STORAGE_KEY = 'earthmc_api_key';
    var GATE_PAGE = 'apikey.html';

    function readKey() {
        try { return window.sessionStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
    }

    function clearKey() {
        try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    function onGatePage() {
        return /\/apikey\.html$/.test(window.location.pathname);
    }

    function gateUrl(reason) {
        var next = window.location.pathname + window.location.search;
        var url = GATE_PAGE + '?next=' + encodeURIComponent(next);
        return reason ? url + '&reason=' + encodeURIComponent(reason) : url;
    }

    function goGate(reason) {
        if (onGatePage()) return;
        window.location.replace(gateUrl(reason));
    }

    if (!readKey()) {
        goGate();
        return;
    }

    var nativeFetch = window.fetch ? window.fetch.bind(window) : null;

    function isApiUrl(input) {
        var raw = typeof input === 'string' ? input : (input && input.url) || '';
        if (!raw) return false;
        try {
            var parsed = new URL(raw, window.location.href);
            return parsed.origin === window.location.origin && /^\/api\//.test(parsed.pathname);
        } catch (e) {
            return false;
        }
    }

    if (nativeFetch) {
        window.fetch = function (input, init) {
            if (!isApiUrl(input)) return nativeFetch(input, init);

            var key = readKey();
            if (!key) {
                goGate('expired');
                return Promise.reject(new Error('缺少 API Key'));
            }

            var options = Object.assign({}, init || {});
            var baseHeaders = options.headers
                || (typeof input === 'object' && input && input.headers)
                || undefined;
            var headers = new Headers(baseHeaders || undefined);
            if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + key);
            options.headers = headers;

            return nativeFetch(input, options).then(function (response) {
                if (response.status === 401) {
                    clearKey();
                    goGate('expired');
                }
                return response;
            });
        };
    }

    function mountSwitchButton() {
        if (onGatePage() || document.getElementById('apiKeySwitch')) return;
        var button = document.createElement('button');
        button.id = 'apiKeySwitch';
        button.type = 'button';
        button.textContent = '更换 Key';
        button.style.cssText = [
            'position:fixed', 'right:1rem', 'bottom:1rem', 'z-index:60',
            'padding:0.55rem 0.95rem', 'border-radius:999px',
            'border:1px solid rgba(37,99,235,0.35)', 'background:rgba(255,255,255,0.94)',
            'color:#1d4ed8', 'font:inherit', 'font-size:0.85rem', 'cursor:pointer',
            'box-shadow:0 10px 24px rgba(15,23,42,0.16)', 'backdrop-filter:blur(8px)'
        ].join(';');
        button.addEventListener('click', function () {
            clearKey();
            window.location.href = gateUrl();
        });
        document.body.appendChild(button);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountSwitchButton);
    } else {
        mountSwitchButton();
    }
})();
