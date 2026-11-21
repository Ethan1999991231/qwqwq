// 管理页：口令门 + 服务器状态 / 节点状态 / 存储
// 口令只在前端比对，不发送到服务器——它是「门帘」，不是认证。
(function () {
    'use strict';

    var ADMIN_HASH = 'RXRoYW4xMTQ1MTQyNTU2NQ==';
    var ADMIN_FLAG = 'earthmc_admin_ok';
    var KEY_NAME = 'earthmc_api_key';
    var REFRESH_MS = 30000;

    var gate = document.getElementById('adminGate');
    var panel = document.getElementById('adminPanel');
    var form = document.getElementById('adminForm');
    var pwd = document.getElementById('adminPassword');
    var statusEl = document.getElementById('adminStatus');
    var refreshBtn = document.getElementById('adminRefresh');
    var logoutBtn = document.getElementById('adminLogout');
    var updatedEl = document.getElementById('adminUpdated');

    var timer = null;
    var running = false;

    var MOON = {
        FULL_MOON: '满月',
        WANING_GIBBOUS: '亏凸月',
        LAST_QUARTER: '下弦月',
        WANING_CRESCENT: '残月',
        NEW_MOON: '新月',
        WAXING_CRESCENT: '娥眉月',
        FIRST_QUARTER: '上弦月',
        WAXING_GIBBOUS: '盈凸月'
    };

    function readKey() {
        try { return window.sessionStorage.getItem(KEY_NAME) || ''; } catch (e) { return ''; }
    }

    function maskKey(key) {
        if (!key) return '';
        return key.length > 12 ? key.slice(0, 4) + '…' + key.slice(-4) : '…';
    }

    function gateOk() {
        try { return window.sessionStorage.getItem(ADMIN_FLAG) === '1'; } catch (e) { return false; }
    }

    function setFlag(on) {
        try {
            if (on) window.sessionStorage.setItem(ADMIN_FLAG, '1');
            else window.sessionStorage.removeItem(ADMIN_FLAG);
        } catch (e) {}
    }

    function setStatus(text, kind) {
        statusEl.textContent = text || '';
        statusEl.className = kind || '';
    }

    function writeRows(id, list) {
        var box = document.getElementById(id);
        box.textContent = '';
        list.forEach(function (pair) {
            var dt = document.createElement('dt');
            dt.textContent = pair[0];
            var dd = document.createElement('dd');
            dd.textContent = pair[1] === undefined || pair[1] === null ? '—' : String(pair[1]);
            box.appendChild(dt);
            box.appendChild(dd);
        });
    }

    function setBadge(id, text, kind) {
        var el = document.getElementById(id);
        el.textContent = text;
        el.className = 'badge' + (kind ? ' ' + kind : '');
    }

    function fmtBytes(bytes) {
        if (!bytes && bytes !== 0) return '—';
        var units = ['B', 'KB', 'MB', 'GB'];
        var value = bytes;
        var i = 0;
        while (value >= 1024 && i < units.length - 1) {
            value /= 1024;
            i += 1;
        }
        return (i === 0 ? value : value.toFixed(1)) + ' ' + units[i];
    }

    function apiHeaders() {
        var key = readKey();
        return key ? { Authorization: 'Bearer ' + key } : {};
    }

    async function timedFetch(url, options) {
        var start = performance.now();
        var response = await fetch(url, options);
        var text = await response.text();
        return {
            ok: response.ok,
            status: response.status,
            ms: Math.round(performance.now() - start),
            text: text,
            headers: response.headers
        };
    }

    async function loadServer() {
        var list = [];
        var key = readKey();
        var result;

        try {
            result = await timedFetch('/api/v4', { headers: apiHeaders(), cache: 'no-store' });
        } catch (error) {
            setBadge('serverBadge', '不通', 'err');
            writeRows('serverList', [['状态', '请求失败：' + (error && error.message ? error.message : '网络错误')]]);
            return;
        }

        if (result.status === 401) {
            setBadge('serverBadge', '401', 'warn');
            writeRows('serverList', [
                ['HTTP', '401 · 没带有效 Key'],
                ['提示', '先去 apikey.html 填一把 Key，本页会用同一份'],
                ['耗时', result.ms + ' ms']
            ]);
            return;
        }

        if (result.status === 429) {
            var wait = result.headers.get('Retry-After');
            setBadge('serverBadge', '429', 'warn');
            writeRows('serverList', [
                ['HTTP', '429 · 上游限流'],
                ['重试', (wait ? wait + ' 秒后' : '过一会儿') + '再刷新'],
                ['耗时', result.ms + ' ms']
            ]);
            return;
        }

        if (!result.ok) {
            setBadge('serverBadge', String(result.status), 'err');
            writeRows('serverList', [['HTTP', result.status], ['耗时', result.ms + ' ms']]);
            return;
        }

        var data;
        try {
            data = JSON.parse(result.text);
        } catch (error) {
            setBadge('serverBadge', '解析失败', 'err');
            writeRows('serverList', [['HTTP', result.status], ['原因', '返回的不是 JSON']]);
            return;
        }

        var stats = data.stats || {};
        var status = data.status || {};
        var vote = data.voteParty || {};
        var day = stats.fullTime ? Math.floor(stats.fullTime / 24000) + 1 : null;

        list.push(['版本', data.version || '—']);
        list.push(['在线 / 上限', (stats.numOnlinePlayers === undefined ? '—' : stats.numOnlinePlayers) + ' / ' + (stats.maxPlayers === undefined ? '—' : stats.maxPlayers)]);
        list.push(['服务器天数', day ? '第' + day + '天' : '—']);
        list.push(['当日时间', stats.time === undefined ? '—' : Math.floor(stats.time / 20) + ' / 1200']);
        list.push(['月相', MOON[data.moonPhase] || data.moonPhase || '—']);
        list.push(['天气', (status.hasStorm ? '下雨' : '晴') + (status.isThundering ? ' · 打雷' : '')]);
        list.push(['VoteParty', vote.numRemaining === undefined ? '—' : vote.numRemaining + ' 票']);
        list.push(['居民 / 城镇 / 国家', [stats.numResidents, stats.numTowns, stats.numNations].map(function (v) { return v === undefined ? '—' : v; }).join(' / ')]);
        list.push(['HTTP · 耗时', result.status + ' · ' + result.ms + ' ms']);
        list.push(['Key', key ? '已带 · ' + maskKey(key) : '未带']);

        setBadge('serverBadge', '正常', 'ok');
        writeRows('serverList', list);
    }

    async function loadNode() {
        var list = [];
        var cdn = false;

        list.push(['访问地址', window.location.host]);

        try {
            var trace = await timedFetch('/cdn-cgi/trace', { cache: 'no-store' });
            if (trace.ok) {
                var map = {};
                trace.text.trim().split('\n').forEach(function (line) {
                    var i = line.indexOf('=');
                    if (i > 0) map[line.slice(0, i)] = line.slice(i + 1);
                });
                cdn = true;
                list.push(['CDN', 'Cloudflare']);
                list.push(['节点 / 地区', (map.colo || '?') + ' / ' + (map.loc || '?')]);
                list.push(['协议 / TLS', (map.http || '?') + ' · ' + (map.tls || '?')]);
                list.push(['trace 耗时', trace.ms + ' ms']);
            }
        } catch (error) {}

        if (!cdn) list.push(['CDN', '不是 Cloudflare（取不到 /cdn-cgi/trace）']);

        var head = null;
        try {
            head = await timedFetch('/index.html', { method: 'HEAD', cache: 'no-store' });
        } catch (error) {}

        list.push(['站点服务器', head ? (head.headers.get('server') || '未声明') : '取不到']);
        list.push(['静态页', head ? head.status + ' · ' + head.ms + ' ms' : '—']);

        var probes = [
            ['EarthMC API', '/api/v4', { headers: apiHeaders() }],
            ['入口页', '/apikey.html', {}],
            ['关于页', '/about.html', {}]
        ];

        for (var i = 0; i < probes.length; i += 1) {
            var name = probes[i][0];
            var path = probes[i][1];
            var options = Object.assign({ cache: 'no-store' }, probes[i][2]);
            try {
                var probe = await timedFetch(path, options);
                list.push([name, probe.status + ' · ' + probe.ms + ' ms']);
            } catch (error) {
                list.push([name, '失败 · ' + (error && error.message ? error.message : '网络错误')]);
            }
        }

        setBadge('nodeBadge', cdn ? 'Cloudflare' : '直连', cdn ? 'ok' : 'warn');
        writeRows('nodeList', list);
    }

    function storeInfo(storage) {
        var info = { count: 0, bytes: 0 };
        try {
            for (var i = 0; i < storage.length; i += 1) {
                var key = storage.key(i);
                info.count += 1;
                info.bytes += (key ? key.length : 0) + (storage.getItem(key) || '').length;
            }
        } catch (e) {}
        return info;
    }

    async function loadStorage() {
        var list = [];
        var key = readKey();

        if (navigator.storage && navigator.storage.estimate) {
            try {
                var estimate = await navigator.storage.estimate();
                list.push(['站点配额', fmtBytes(estimate.quota)]);
                list.push(['已用', fmtBytes(estimate.usage)]);
            } catch (error) {
                list.push(['站点配额', '读不到']);
            }
        } else {
            list.push(['站点配额', '浏览器不支持 estimate()']);
        }

        var local = storeInfo(window.localStorage);
        var session = storeInfo(window.sessionStorage);
        list.push(['localStorage', local.count + ' 项 · ' + fmtBytes(local.bytes)]);
        list.push(['sessionStorage', session.count + ' 项 · ' + fmtBytes(session.bytes)]);
        list.push(['API Key', key ? '已保存 · ' + maskKey(key) : '未保存']);
        list.push(['Key 位置', key ? 'sessionStorage · ' + KEY_NAME : '—']);

        var resources = performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
        var bytes = 0;
        var counted = 0;
        resources.forEach(function (entry) {
            if (entry.transferSize > 0) {
                bytes += entry.transferSize;
                counted += 1;
            }
        });
        list.push(['本次加载资源', counted + ' 个 · ' + fmtBytes(bytes)]);

        setBadge('storageBadge', '本地', 'ok');
        writeRows('storageList', list);
    }

    async function refreshAll() {
        if (running) return;
        running = true;
        refreshBtn.disabled = true;
        updatedEl.textContent = '读取中…';
        try {
            await Promise.all([loadServer(), loadNode(), loadStorage()]);
            var now = new Date();
            updatedEl.textContent = '更新于 ' + now.toLocaleTimeString('zh-CN');
        } finally {
            running = false;
            refreshBtn.disabled = false;
        }
    }

    function startAuto() {
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
            if (!document.hidden) refreshAll();
        }, REFRESH_MS);
    }

    function enterPanel() {
        gate.hidden = true;
        panel.hidden = false;
        refreshAll();
        startAuto();
    }

    function leavePanel() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        setFlag(false);
        panel.hidden = true;
        gate.hidden = false;
        pwd.value = '';
        setStatus('已退出，口令重新输一次。', 'ok');
        pwd.focus();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var value = pwd.value;
        if (!value) {
            setStatus('先输口令。', 'err');
            return;
        }
        var encoded = '';
        try { encoded = window.btoa(value); } catch (e) { encoded = ''; }
        if (encoded !== ADMIN_HASH) {
            setStatus('口令不对。', 'err');
            pwd.select();
            return;
        }
        setFlag(true);
        setStatus('口令对了，正在读取状态…', 'ok');
        enterPanel();
    });

    refreshBtn.addEventListener('click', refreshAll);
    logoutBtn.addEventListener('click', leavePanel);

    if (gateOk()) {
        enterPanel();
    } else {
        pwd.focus();
    }
})();
