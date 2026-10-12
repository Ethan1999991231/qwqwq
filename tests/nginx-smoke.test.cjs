const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const nginx = path.join(root, 'tools/nginx-1.30.0/nginx.exe');
const run = promisify(execFile);
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const pause = () => new Promise(resolve => setTimeout(resolve, 50));

test('real nginx serves pages, blocks private files and preserves proxy paths and POST bodies', async () => {
    const configSource = fs.readFileSync(path.join(root, 'nginx.conf'), 'utf8');
    const listeners = configSource.match(/\blisten\s+[^;]+;/g) ?? [];
    assert.equal(listeners.length, 1, 'test requires exactly one production listener before replacing it');
    const upstream = http.createServer((request, response) => {
        let body = '';
        request.on('data', chunk => { body += chunk; });
        request.on('end', () => {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ url: request.url, method: request.method, body }));
        });
    });
    await listen(upstream);
    const portProbe = http.createServer();
    await listen(portProbe);
    const port = portProbe.address().port;
    await new Promise(resolve => portProbe.close(resolve));
    const fixture = fs.mkdtempSync(path.join(root, 'temp', 'earthmc-nginx-test-'));
    const relativeFixture = path.relative(root, fixture).replaceAll('\\', '/');
    const configName = relativeFixture + '/nginx.conf';
    let config = configSource
        .replace(/\blisten\s+[^;]+;/, 'listen       127.0.0.1:' + port + ';')
        .replace('pid logs/nginx.pid;', 'pid ' + relativeFixture + '/nginx.pid;')
        .replaceAll('proxy_pass https://', 'proxy_pass http://')
        .replaceAll('api.earthmc.net;', '127.0.0.1:' + upstream.address().port + ';')
        .replaceAll('mc-heads.net;', '127.0.0.1:' + upstream.address().port + ';')
        .replaceAll('minotar.net;', '127.0.0.1:' + upstream.address().port + ';')
        .replace('logs/nginx-error.log', relativeFixture + '/error.log')
        .replace('logs/nginx-access.log', relativeFixture + '/access.log');
    fs.writeFileSync(path.join(fixture, 'nginx.conf'), config);
    fs.copyFileSync(path.join(root, 'mime.types'), path.join(fixture, 'mime.types'));
    const options = { cwd: root, windowsHide: true, timeout: 10000 };
    const args = ['-p', './', '-c', configName];
    let started = false;
    try {
        await run(nginx, [...args, '-t'], options);
        const child = spawn(nginx, args, { cwd: root, windowsHide: true, stdio: 'ignore' });
        child.unref();
        started = true;
        const base = 'http://127.0.0.1:' + port;
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            try { ready = (await fetch(base + '/index.html')).status === 200; } catch {}
            if (ready) break;
            await pause();
        }
        assert.equal(ready, true, 'nginx should start on its dedicated test port');
        const about = await (await fetch(base + '/about.html')).text();
        assert.match(about, /代码原作者/);
        assert.match(about, /此网页作者：Ethan/);
        for (const privatePath of ['/.git/config', '/nginx.conf', '/NGINX.CONF', '/logs/nginx-error.log', '/LoGs/nginx-error.log', '/tests/player-avatar.test.cjs']) {
            assert.equal((await fetch(base + privatePath)).status, 404, privatePath);
        }
        const body = JSON.stringify({ query: ['Notch'] });
        const playerResponse = await fetch(base + '/api/v4/players?test=1', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body
        });
        assert.equal(playerResponse.status, 200);
        assert.deepEqual(await playerResponse.json(), { url: '/v4/players?test=1', method: 'POST', body });
        const uuid = '069a79f444e94726a5befca90e38aaf5';
        assert.equal((await (await fetch(base + '/avatar/' + uuid)).json()).url, '/avatar/' + uuid + '/128');
        assert.equal((await (await fetch(base + '/avatar-backup/' + uuid)).json()).url, '/helm/' + uuid + '/128.png');
        const results = await Promise.all(Array.from({ length: 20 }, () => fetch(base + '/index.html')));
        assert.ok(results.every(response => response.status === 200));
    } finally {
        if (started) {
            await run(nginx, [...args, '-s', 'quit'], options);
            for (let attempt = 0; attempt < 100 && fs.existsSync(path.join(fixture, 'nginx.pid')); attempt++) await pause();
            assert.equal(fs.existsSync(path.join(fixture, 'nginx.pid')), false, 'test server should shut down cleanly');
        }
        await new Promise(resolve => upstream.close(resolve));
        assert.ok(path.resolve(fixture).startsWith(path.join(root, 'temp', 'earthmc-nginx-test-')));
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});
