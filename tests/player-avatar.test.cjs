const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../javascript/js-playersearch.js'), 'utf8');
const uuid = '069a79f4-44e9-4726-a5be-fca90e38aaf5';

function page(response) {
    const avatar = { src: '', alt: '', onerror: null };
    const button = { textContent: '', disabled: false };
    const alerts = [];
    const context = vm.createContext({
        document: {
            getElementById: id => ({ avatarImg: avatar, searchButton: button }[id] ?? null),
            querySelector: () => null
        },
        window: { location: { search: '' } },
        URLSearchParams, AbortSignal, AbortController, setTimeout, clearTimeout,
        fetch: async () => response,
        console: { error() {} },
        alert: message => alerts.push(message)
    });
    vm.runInContext(source, context);
    return { avatar, button, alerts, context };
}

test('avatar requests stay on this website and failures end after one fallback', async () => {
    const { avatar, context } = page({ ok: true, json: async () => [{ name: 'Notch', uuid }] });
    await context.loadPlayer('Notch');
    assert.equal(avatar.src, '/avatar/' + uuid.replaceAll('-', ''));
    avatar.onerror();
    assert.equal(avatar.src, '/avatar-backup/' + uuid.replaceAll('-', ''));
    avatar.onerror();
    assert.equal(avatar.onerror, null);
    assert.match(avatar.src, /^data:image\/svg\+xml/);
    assert.match(avatar.alt, /加载失败/);
});

test('HTTP failures do not render a response as player data and restore the query button', async () => {
    let bodyRead = false;
    const { avatar, alerts, button, context } = page({
        ok: false, status: 502,
        json: async () => { bodyRead = true; return [{ name: 'Notch', uuid }]; }
    });
    await context.loadPlayer('Notch');
    assert.equal(bodyRead, false);
    assert.equal(avatar.src, '');
    assert.equal(alerts.length, 1);
    assert.equal(button.disabled, false);
});

test('player query works without the newer AbortSignal.timeout API', async () => {
    const { avatar, context } = page({ ok: true, json: async () => [{ name: 'Notch', uuid }] });
    context.AbortSignal = {};
    await context.loadPlayer('Notch');
    assert.equal(avatar.src, '/avatar/' + uuid.replaceAll('-', ''));
});
