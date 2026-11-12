export type Subtitle = { id: string; startMs: number; endMs: number; text: string };

export type Scene = {
  id: string;
  startMs: number;
  durationMs: number;
  component: string;
  props: Record<string, unknown>;
};

export type Storyboard = {
  schemaVersion: string;
  video: { title: string; width: number; height: number; fps: number; durationMs: number };
  audio: { src: string; durationMs: number };
  scenes: Scene[];
  subtitles: Subtitle[];
};

export const storyboard: Storyboard = {
  schemaVersion: "1.1",
  video: {
    title: "Mengenal HTML, CSS, dan JavaScript",
    width: 1080,
    height: 1920,
    fps: 30,
    durationMs: 38440,
  },
  audio: { src: "audio/voiceover-v1.wav", durationMs: 38440 },
  scenes: [
    {
      id: "scene-001",
      startMs: 0,
      durationMs: 4544,
      component: "TitleReveal",
      props: {
        title: "Website itu dibuat dari apa?",
        subtitle: "HTML · CSS · JavaScript",
        delayMs: 150,
      },
    },
    {
      id: "scene-002",
      startMs: 4544,
      durationMs: 9437,
      component: "CodeScene",
      props: {
        badge: "HTML",
        caption: "Rangka halaman",
        accent: "#e4572e",
        filename: "index.html",
        code: [
          "<h1>Halo, dunia!</h1>",
          "<p>Ini halaman pertamaku.</p>",
          "<button>Klik saya</button>",
        ],
        preview: "plain",
        typeStartMs: 1300,
        typeMs: 5000,
      },
    },
    {
      id: "scene-003",
      startMs: 13981,
      durationMs: 8058,
      component: "CodeScene",
      props: {
        badge: "CSS",
        caption: "Cat dan dekorasi",
        accent: "#3d8bfd",
        filename: "style.css",
        code: [
          "h1 { color: #e4572e; }",
          "p { color: #5b6b7f; }",
          "button { background: #3d8bfd; }",
        ],
        preview: "styled",
        typeStartMs: 600,
        typeMs: 4500,
      },
    },
    {
      id: "scene-004",
      startMs: 22039,
      durationMs: 7371,
      component: "CodeScene",
      props: {
        badge: "JavaScript",
        caption: "Listrik yang menghidupkan",
        accent: "#f7c948",
        filename: "script.js",
        code: ["tombol.onclick = () => {", "  lampu.nyala();", "};"],
        preview: "lamp",
        typeStartMs: 500,
        typeMs: 3000,
        lampOnMs: 4700,
      },
    },
    {
      id: "scene-005",
      startMs: 29410,
      durationMs: 9030,
      component: "SummaryCards",
      props: {
        cards: [
          { label: "HTML", text: "Struktur", color: "#e4572e" },
          { label: "CSS", text: "Tampilan", color: "#3d8bfd" },
          { label: "JavaScript", text: "Interaksi", color: "#f7c948" },
        ],
        revealMs: [700, 2000, 3500],
        headline: "Website jadi hidup",
        headlineMs: 5700,
      },
    },
  ],
  subtitles: [
    { id: "sub-001", startMs: 0, endMs: 4025, text: "Pernah penasaran, website itu sebenarnya dibuat dari apa?" },
    { id: "sub-002", startMs: 4544, endMs: 5468, text: "Bayangkan sebuah rumah." },
    { id: "sub-003", startMs: 5869, endMs: 10437, text: "HTML adalah rangkanya: dinding, pintu, dan jendela." },
    { id: "sub-004", startMs: 10740, endMs: 13523, text: "Dia menentukan apa saja yang ada di halaman." },
    { id: "sub-005", startMs: 13981, endMs: 16794, text: "CSS adalah cat dan dekorasinya." },
    { id: "sub-006", startMs: 17190, endMs: 21513, text: "Warna, ukuran, dan tata letak, semuanya diatur di sini." },
    { id: "sub-007", startMs: 22039, endMs: 24267, text: "Lalu JavaScript adalah listriknya." },
    { id: "sub-008", startMs: 24735, endMs: 28962, text: "Saat kamu menekan saklar dan lampu menyala, itu kerja JavaScript." },
    { id: "sub-009", startMs: 29410, endMs: 34900, text: "Jadi, HTML untuk struktur, CSS untuk tampilan, dan JavaScript untuk interaksi." },
    { id: "sub-010", startMs: 35100, endMs: 37847, text: "Tiga serangkai yang membuat website hidup." },
  ],
};