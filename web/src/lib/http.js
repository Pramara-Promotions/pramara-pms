// web/src/lib/http.js
export async function http(path, init = {}) {
  const addAuth = (token, init) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return { ...init, headers };
  };

  let token = sessionStorage.getItem("accessToken");
  let res = await fetch(path, addAuth(token, init));

  if (res.status === 401 && sessionStorage.getItem("refreshToken")) {
    const r = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: sessionStorage.getItem("refreshToken") }),
    });
    if (r.ok) {
      const data = await r.json();
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("refreshToken", data.refreshToken);
      res = await fetch(path, addAuth(data.accessToken, init));
    }
  }
  return res;
}
