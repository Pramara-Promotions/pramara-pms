// web/src/lib/api.js
export async function api(path, options = {}) {
  const token = sessionStorage.getItem("accessToken");
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    ...options,
    headers,
  });

  // if unauthorized → redirect to login
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = "/login";
    return res;
  }

  return res;
}
