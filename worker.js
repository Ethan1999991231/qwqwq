// EarthMC 现在要求每个 API 请求带 `Authorization: Bearer <API Key>`，否则一律 401。
// 本站走「访客自己填 Key」：浏览器带来的 Authorization 原样转发给上游。
// 不要在这里写死 Key —— 仓库是公开的。真要给没填 Key 的请求兜底，配环境变量 EARTHMC_API_KEY。

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let upstream;
    let isApi = false;

    if (/^\/api\/v4(?:\/|$)/.test(url.pathname)) {
      upstream =
        "https://api.earthmc.net" +
        url.pathname.slice(4) +
        url.search;
      isApi = true;
    } else {
      const avatar = url.pathname.match(
        /^\/(avatar|avatar-backup)\/([a-fA-F0-9]{32})$/
      );

      if (avatar) {
        upstream = avatar[1] === "avatar"
          ? "https://mc-heads.net/avatar/" + avatar[2] + "/128"
          : "https://minotar.net/helm/" + avatar[2] + "/128.png";
      }
    }

    if (!upstream) return env.ASSETS.fetch(request);

    if (!["GET", "HEAD", "POST"].includes(request.method)) {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const headers = new Headers();
    const contentType = request.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);

    if (isApi) {
      // 优先用访客自己填的 Key；没有时才用可选的站长兜底 Key
      const clientAuth = request.headers.get("Authorization");
      const ownerKey = env && env.EARTHMC_API_KEY;
      const auth = clientAuth || (ownerKey ? "Bearer " + ownerKey : "");
      if (auth) headers.set("Authorization", auth);
    }

    try {
      return await fetch(upstream, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : request.body,
        redirect: "follow",
        signal: AbortSignal.timeout(
          url.pathname.startsWith("/api/") ? 30000 : 10000
        )
      });
    } catch {
      return new Response("上游服务连接失败", { status: 502 });
    }
  }
};
