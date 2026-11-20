// Alamat backend. Ubah lewat file .env di folder frontend: VITE_API=http://127.0.0.1:8000
export const API = import.meta.env.VITE_API || "http://127.0.0.1:8000";

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke backend. Pastikan server backend berjalan (uvicorn).");
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") {
        msg = j.detail;
      } else if (j.detail) {
        msg = JSON.stringify(j.detail);
      }
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
  advance: (id) => call("POST", `/videos/${id}/advance`),
  approve: (id, point) => call("POST", `/videos/${id}/approve/${point}`),
  selectIdea: (id, index) => call("POST", `/videos/${id}/select-idea`, { index }),
  runs: (id) => call("GET", `/videos/${id}/runs`),
  text: (id, stage) => call("GET", `/videos/${id}/text/${stage}`),
  saveText: (id, stage, text) => call("PUT", `/videos/${id}/${stage}`, { text }),
  uploadMaterial: async (id, file) => {
    const form = new FormData();
    form.append("file", file);
    let res;
    try {
      res = await fetch(API + `/videos/${id}/material/upload`, {
        method: "POST",
        body: form,
      });
    } catch {
      throw new Error("Tidak bisa terhubung ke backend. Pastikan server backend berjalan (uvicorn).");
    }
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  },
  voices: () => call("GET", "/voices"),
  series: () => call("GET", "/series"),
  getTutorSession: (id) => call("GET", `/videos/${id}/tutor/session`),
  sendTutorTurn: (id, message) => call("POST", `/videos/${id}/tutor/turn`, { message }),
  finishTutorSession: (id) => call("POST", `/videos/${id}/tutor/finish`),
  resetTutorSession: (id) => call("POST", `/videos/${id}/tutor/reset`),
};

export const fileUrl = (artifactId) => `${API}/artifacts/${artifactId}/file`;
export const sampleUrl = (voice) => `${API}/voices/${voice}/sample`;