const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'players.html', 'player.html', 'towns.html', 'town.html', 'nations.html', 'nation.html', 'about.html', '404.html', 'apikey.html'];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('admin page is reachable by URL only and stays out of every navigation', () => {
    const admin = read('admin.html');
    assert.match(admin, /name="robots" content="noindex/);
    assert.match(admin, /javascript\/js-admin\.js\?v=/);
    assert.doesNotMatch(admin, /<a[^>]+href="admin\.html"/, 'admin page must not link to itself');
    for (const page of pages) {
        assert.doesNotMatch(read(page), /admin\.html/, page + ' must not link to admin.html');
    }
});

test('admin panel unlocks only with the configured passphrase', () => {
    const source = read('javascript/js-admin.js');
    const hash = source.match(/var ADMIN_HASH = '([^']+)'/)[1];
    assert.equal(Buffer.from('Ethan11451425565', 'utf8').toString('base64'), hash);
    assert.match(source, /window\.btoa\(value\)/);
    assert.match(source, /sessionStorage/);
});

test('switch-key button is a fixed pill that survives the full-width mobile button rule', () => {
    const guard = read('javascript/js-apikey-guard.js');
    assert.match(guard, /button\.className = 'apikey-switch'/);
    assert.doesNotMatch(guard, /position:fixed/, 'positioning belongs in the stylesheet, not inline styles');
    const css = read('style/style-main.css');
    assert.match(css, /\.apikey-switch \{[^}]*position:\s*fixed/);
    assert.match(css, /\.apikey-switch \{[^}]*width:\s*auto/);
    assert.match(css, /\.apikey-switch \{[^}]*min-width:\s*0/);
});
