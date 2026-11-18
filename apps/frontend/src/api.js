// Alamat backend. Ubah lewat file .env di folder frontend: VITE_API=http://127.0.0.1:8000
export const API = import.meta.env.VITE_API || "http://127.0.0.1:8000";

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke backend. Pastikan server backend berjalan (uvicorn).");
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  videos: () => call("GET", "/videos"),
  video: (id) => call("GET", `/videos/${id}`),
  createVideo: (b) => call("POST", "/videos", b),
  patchVideo: (id, b) => call("PATCH", `/videos/${id}`, b),
  scan: (id) => call("POST", `/videos/${id}/scan`),
  run: (id, stage) => call("POST", `/videos/${id}/run/${stage}`),
  approve: (id, point) => call("POST", `/videos/${id}/approve/${point}`),
  runs: (id) => call("GET", `/videos/${id}/runs`),
  text: (id, stage) => call("GET", `/videos/${id}/text/${stage}`),
  saveText: (id, stage, text) => call("PUT", `/videos/${id}/${stage}`, { text }),
  voices: () => call("GET", "/voices"),
  series: () => call("GET", "/series"),
};

export const fileUrl = (artifactId) => `${API}/artifacts/${artifactId}/file`;
export const sampleUrl = (voice) => `${API}/voices/${voice}/sample`;
