export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let upstream;

    if (/^\/api\/v4(?:\/|$)/.test(url.pathname)) {
      upstream =
        "https://api.earthmc.net" +
        url.pathname.slice(4) +
        url.search;
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
