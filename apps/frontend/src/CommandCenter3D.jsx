import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { AGENT_STAGES, STATUS_LABEL } from "./agentsConfig.js";

function isStageRunning(st) {
  return Boolean(st?.last_run && ["queued", "running"].includes(st.last_run.status));
}

function getStageProgress(st) {
  if (!st) return 0;
  if (isStageRunning(st)) return 65;
  if (st.status === "approved") return 100;
  if (st.status === "draft") return 85;
  if (st.status === "stale") return 50;
  return 0;
}

export default function CommandCenter3D({
  video,
  focusedIndex,
  cameraRequest,
  isSleepMode,
  perfPreset,
  busy,
  onFocusAgent,
  onOpenWorkspace,
  onRunStage,
  onApprovePoint,
  onFpsUpdate,
}) {
  const webglRef = useRef(null);
  const css2dRef = useRef(null);

  const stateRef = useRef({
    video,
    focusedIndex,
    isSleepMode,
    perfPreset,
    busy,
    onFocusAgent,
    onOpenWorkspace,
    onRunStage,
    onApprovePoint,
    onFpsUpdate,
  });

  useEffect(() => {
    stateRef.current = {
      video,
      focusedIndex,
      isSleepMode,
      perfPreset,
      busy,
      onFocusAgent,
      onOpenWorkspace,
      onRunStage,
      onApprovePoint,
      onFpsUpdate,
    };
  });

  const rigRef = useRef(null);
  const entitiesRef = useRef([]);
  const rendererRef = useRef(null);

  // Sync pixelRatio saat mode Eco / Balanced berubah
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setPixelRatio(
      perfPreset === "eco" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    );
  }, [perfPreset]);

  // Guided camera movement saat user memilih agent / overview / command wall
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || !cameraRequest) return;
    const { target } = cameraRequest;
    if (target === "overview") {
      rig.targetPos.set(0, 4.5, 15.6);
      rig.targetLookAt.set(0, 2.0, -3.5);
      rig.isTransitioning = true;
    } else if (target === "wall") {
      rig.targetPos.set(0, 5.2, -3.0);
      rig.targetLookAt.set(0, 5.5, -18.0);
      rig.isTransitioning = true;
    } else if (typeof target === "number" && AGENT_STAGES[target]) {
      const [x, y, z] = AGENT_STAGES[target].coords;
      const pos = new THREE.Vector3(x, y, z);
      const toCenter = new THREE.Vector3(0, 0, -0.5).sub(pos).normalize();
      const rightVec = new THREE.Vector3(-toCenter.z, 0, toCenter.x);
      const standPos = pos
        .clone()
        .add(toCenter.clone().multiplyScalar(3.75))
        .add(rightVec.clone().multiplyScalar(0.55));
      standPos.y = 2.05;

      rig.targetPos.copy(standPos);
      rig.targetLookAt.set(pos.x + rightVec.x * 0.45, 1.62, pos.z + rightVec.z * 0.45);
      rig.isTransitioning = true;
    }
  }, [cameraRequest]);

  // Update kartu & tag 2D setiap kali data video / fokus berubah
  useEffect(() => {
    entitiesRef.current.forEach((ent, idx) => {
      const ag = AGENT_STAGES[idx];
      const st = video?.stages?.[ag.key];
      const running = isStageRunning(st);
      const status = st?.status || "empty";
      const progress = getStageProgress(st);
      const isSelected = focusedIndex === idx;

      ent.focusCardObj.visible = isSelected;
      ent.tagObj.visible = !isSelected;

      const dotColor = running
        ? "#00f0ff"
        : status === "approved"
        ? "#10b981"
        : status === "draft"
        ? "#f59e0b"
        : status === "stale"
        ? "#f43f5e"
        : "#64748b";

      ent.tagEl.innerHTML = `
        <span class="w-2 h-2 rounded-full ${running ? "animate-ping" : ""}" style="background:${dotColor}"></span>
        <span style="color:${ag.colorCss}">${ag.index + 1}. ${ag.name}</span>
      `;

      const statusBadge = running
        ? `<span class="text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-400/40 uppercase animate-pulse">BERJALAN</span>`
        : `<span class="text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded-full border ${
            status === "approved"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
              : status === "draft"
              ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
              : status === "stale"
              ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
              : "bg-slate-800 text-slate-300 border-slate-700"
          } uppercase">${STATUS_LABEL[status] || status}</span>`;

      const canApprove = Boolean(ag.approval && st?.version && status === "draft");
      const canRun = Boolean(st?.can_run && !running && !busy);
      const whyNot = !running && !st?.can_run && st?.why_not ? st.why_not : "";
      const isFailed = st?.last_run?.status === "failed";

      ent.focusCardEl.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <div class="text-[9px] font-mono-tech tracking-wider uppercase" style="color:${ag.colorCss}">${ag.scopeTag}</div>
            <div class="flex items-center gap-2 mt-0.5">
              <h4 class="font-heading text-sm font-bold text-white">${ag.index + 1}. ${ag.name}</h4>
              <span class="text-[10px] font-mono-tech text-slate-400">${st?.version ? `v${st.version}` : "kosong"}</span>
            </div>
          </div>
          ${statusBadge}
        </div>

        <p class="text-[11px] text-slate-300 leading-snug mb-2.5">${ag.persona}</p>

        <div class="space-y-1 mb-2.5">
          <div class="flex justify-between text-[10px] font-mono-tech">
            <span class="text-slate-400">TAHAP: ${ag.key.toUpperCase()}</span>
            <span style="color:${ag.colorCss}" class="font-bold">${progress}%</span>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width:${progress}%; background:${ag.colorCss}"></div>
          </div>
        </div>

        ${whyNot ? `<div class="text-[10px] font-mono-tech text-amber-300/90 bg-amber-950/40 border border-amber-500/25 rounded-lg px-2.5 py-1.5 mb-2">⚠ ${whyNot}</div>` : ""}
        ${isFailed ? `<div class="text-[10px] font-mono-tech text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-lg px-2.5 py-1.5 mb-2">✕ Eksekusi terakhir gagal — cek log di Ruang Kerja</div>` : ""}

        <div class="grid grid-cols-2 gap-1.5 mb-1.5">
          <button data-action="run" ${canRun ? "" : "disabled"} title="${st?.why_not || ""}"
            class="py-1.5 px-2 rounded-lg font-mono-tech text-[11px] font-bold transition ${
              canRun
                ? "bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 cursor-pointer"
                : "bg-slate-900/80 border border-slate-800 text-slate-500 cursor-not-allowed"
            }">
            ${running ? "Berjalan..." : st?.version ? "↻ Ulangi" : "▶ Jalankan"}
          </button>
          ${
            ag.approval
              ? `<button data-action="approve" ${canApprove && !busy ? "" : "disabled"}
                  class="py-1.5 px-2 rounded-lg font-mono-tech text-[11px] font-bold transition ${
                    canApprove && !busy
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                      : "bg-slate-900/80 border border-slate-800 text-slate-500 cursor-not-allowed"
                  }">
                  ✓ Setujui
                </button>`
              : `<div class="py-1.5 px-2 rounded-lg bg-slate-900/50 border border-slate-800/80 text-[10px] font-mono-tech text-slate-500 text-center flex items-center justify-center">Otomatis</div>`
          }
        </div>

        <button data-action="open" class="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono-tech font-bold text-white transition cursor-pointer flex items-center justify-center gap-2">
          <span>MASUK RUANG KERJA</span>
          <span style="color:${ag.colorCss}">[E]</span>
        </button>
      `;
    });
  }, [video, focusedIndex, busy]);

  useEffect(() => {
    const webglContainer = webglRef.current;
    const css2dContainer = css2dRef.current;
    if (!webglContainer || !css2dContainer) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a14);
    scene.fog = new THREE.FogExp2(0x050a14, 0.0155);

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 140);
    const camRig = {
      pos: new THREE.Vector3(0, 4.5, 15.6),
      targetPos: new THREE.Vector3(0, 4.5, 15.6),
      lookAt: new THREE.Vector3(0, 2.0, -3.5),
      targetLookAt: new THREE.Vector3(0, 2.0, -3.5),
      isTransitioning: false,
    };
    camera.position.copy(camRig.pos);
    rigRef.current = camRig;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(
      stateRef.current.perfPreset === "eco" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    );
    renderer.shadowMap.enabled = false;
    webglContainer.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 2.8;
    controls.maxDistance = 23;
    controls.target.copy(camRig.lookAt);
    controls.addEventListener("start", () => {
      camRig.isTransitioning = false;
    });

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    css2dContainer.appendChild(labelRenderer.domElement);

    // Lighting
    scene.add(new THREE.HemisphereLight(0x1b325c, 0x090e18, 0.9));
    scene.add(new THREE.AmbientLight(0x10192b, 0.6));

    const orchestratorLight = new THREE.PointLight(0x38bdf8, 0.65, 7.5);
    orchestratorLight.position.set(0, 1.35, 0);
    scene.add(orchestratorLight);

    const wallGlowLight = new THREE.PointLight(0x2563eb, 1.15, 22);
    wallGlowLight.position.set(0, 5.8, -13.2);
    scene.add(wallGlowLight);

    // Metallic Deck Floor
    const hullPanelMat = new THREE.MeshStandardMaterial({ color: 0x111a2c, metalness: 0.84, roughness: 0.42 });
    const hullTrimMat = new THREE.MeshStandardMaterial({ color: 0x17243b, metalness: 0.88, roughness: 0.32 });
    const cyanStripMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.3 });
    const blueStripMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.24 });
    const violetStripMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.2 });

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = 512;
    diffCanvas.height = 512;
    const dCtx = diffCanvas.getContext("2d");
    dCtx.fillStyle = "#141b27";
    dCtx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 64) {
      for (let y = 0; y < 512; y += 64) {
        dCtx.strokeStyle = "#090d14";
        dCtx.lineWidth = 2;
        dCtx.strokeRect(x + 1, y + 1, 62, 62);
      }
    }
    [60, 115, 170, 222].forEach((r, idx) => {
      dCtx.strokeStyle = idx === 0 ? "rgba(56, 189, 248, 0.25)" : "rgba(59, 130, 246, 0.12)";
      dCtx.lineWidth = 1.5;
      dCtx.beginPath();
      dCtx.arc(256, 256, r, 0, Math.PI * 2);
      dCtx.stroke();
    });
    const deckTex = new THREE.CanvasTexture(diffCanvas);

    const floorMesh = new THREE.Mesh(
      new THREE.CircleGeometry(24, 64),
      new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.56, metalness: 0.72 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // Outer Hull Wall & Ribs
    const bridgeRadius = 22.0;
    const bridgeHeight = 11.2;
    const outerHullWall = new THREE.Mesh(
      new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, bridgeHeight, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x070e1b, metalness: 0.85, roughness: 0.36, side: THREE.BackSide })
    );
    outerHullWall.position.y = bridgeHeight / 2;
    scene.add(outerHullWall);

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, bridgeHeight, 0.7), hullTrimMat);
      rib.position.set(Math.sin(angle) * (bridgeRadius - 0.25), bridgeHeight / 2, -Math.cos(angle) * (bridgeRadius - 0.25));
      rib.lookAt(0, bridgeHeight / 2, 0);
      scene.add(rib);

      const ribLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 8.6, 0.05),
        i % 3 === 0 ? violetStripMat : blueStripMat
      );
      ribLight.position.set(Math.sin(angle) * (bridgeRadius - 0.63), 5.2, -Math.cos(angle) * (bridgeRadius - 0.63));
      ribLight.lookAt(0, 5.2, 0);
      scene.add(ribLight);
    }

    // Central Orchestrator Core at (0, 0, 0)
    const orchestratorGroup = new THREE.Group();
    scene.add(orchestratorGroup);

    const daisOuter = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.35, 0.14, 48), hullPanelMat);
    daisOuter.position.y = 0.07;
    orchestratorGroup.add(daisOuter);

    const daisBase = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.68, 0.12, 48), hullTrimMat);
    daisBase.position.y = 0.18;
    orchestratorGroup.add(daisBase);

    const daisRing = new THREE.Mesh(
      new THREE.RingGeometry(1.53, 1.57, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    daisRing.rotation.x = -Math.PI / 2;
    daisRing.position.y = 0.243;
    orchestratorGroup.add(daisRing);

    const orchCoreGroup = new THREE.Group();
    orchCoreGroup.position.y = 1.68;
    orchestratorGroup.add(orchCoreGroup);

    const coreNucleus = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 1),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 })
    );
    orchCoreGroup.add(coreNucleus);

    const innerCrystal = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.44, 0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.56 })
    );
    orchCoreGroup.add(innerCrystal);

    const orchRings = [];
    [0.92, 1.15, 1.38].forEach((r, i) => {
      const ringPivot = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.008, 10, 64),
        new THREE.MeshBasicMaterial({ color: i % 2 === 1 ? 0x6366f1 : 0x38bdf8, transparent: true, opacity: 0.42 })
      );
      ringPivot.rotation.x = Math.PI / 3.2 + i * 0.38;
      ringPivot.rotation.y = i * 0.72;
      ringPivot.add(ring);
      orchCoreGroup.add(ringPivot);
      orchRings.push(ringPivot);
    });

    // Central Command Wall (Dynamic Canvas reflecting real 10-stage backend data)
    const wallCanvas = document.createElement("canvas");
    wallCanvas.width = 1680;
    wallCanvas.height = 680;
    const wallCtx = wallCanvas.getContext("2d");
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.anisotropy = 4;

    const wallRadius = 19.0;
    const wallArc = Math.PI * 0.54;
    const wallHeight = 6.15;
    const wallY = 5.65;

    const wallGeo = new THREE.CylinderGeometry(
      wallRadius,
      wallRadius,
      wallHeight,
      56,
      1,
      true,
      Math.PI - wallArc / 2,
      wallArc
    );
    wallGeo.scale(-1, 1, 1);

    const commandWallMesh = new THREE.Mesh(
      wallGeo,
      new THREE.MeshBasicMaterial({ map: wallTexture, transparent: true, opacity: 0.96, side: THREE.DoubleSide })
    );
    commandWallMesh.position.set(0, wallY, 0);
    commandWallMesh.userData = { type: "wall" };
    scene.add(commandWallMesh);

    const wallBorderGeo = new THREE.CylinderGeometry(
      wallRadius - 0.02,
      wallRadius - 0.02,
      0.06,
      56,
      1,
      true,
      Math.PI - wallArc / 2,
      wallArc
    );
    const wallTopBar = new THREE.Mesh(wallBorderGeo, cyanStripMat);
    wallTopBar.position.set(0, wallY + wallHeight / 2 + 0.04, 0);
    scene.add(wallTopBar);
    const wallBotBar = new THREE.Mesh(wallBorderGeo, cyanStripMat);
    wallBotBar.position.set(0, wallY - wallHeight / 2 - 0.04, 0);
    scene.add(wallBotBar);

    function drawCommandWall(t) {
      const curVideo = stateRef.current.video;
      wallCtx.fillStyle = "rgba(5, 11, 22, 0.96)";
      wallCtx.fillRect(0, 0, 1680, 680);

      wallCtx.strokeStyle = "rgba(0, 229, 255, 0.05)";
      wallCtx.lineWidth = 1;
      for (let x = 0; x <= 1680; x += 84) {
        wallCtx.beginPath();
        wallCtx.moveTo(x, 0);
        wallCtx.lineTo(x, 680);
        wallCtx.stroke();
      }

      wallCtx.fillStyle = "#22d3ee";
      wallCtx.font = '700 28px "Space Grotesk", sans-serif';
      wallCtx.fillText("CENTRAL COMMAND WALL  //  10-STAGE ORCHESTRATOR v1.3", 54, 62);

      const subHeader = curVideo
        ? `VIDEO: ${(curVideo.title || curVideo.name).toUpperCase()}  •  HARI ${curVideo.day}  •  NARATOR: ${curVideo.voice}`
        : "BELUM ADA VIDEO AKTIF  •  PILIH ATAU BUAT VIDEO BARU";
      wallCtx.fillStyle = "#94a3b8";
      wallCtx.font = '500 18px "JetBrains Mono", monospace';
      wallCtx.fillText(subHeader, 54, 96);

      // Column 1: Left Wing (Stages 1-5)
      wallCtx.fillStyle = "rgba(9, 17, 32, 0.74)";
      wallCtx.fillRect(54, 130, 515, 505);
      wallCtx.strokeStyle = "rgba(34, 211, 238, 0.28)";
      wallCtx.strokeRect(54, 130, 515, 505);

      wallCtx.fillStyle = "#38bdf8";
      wallCtx.font = '700 20px "JetBrains Mono", monospace';
      wallCtx.fillText("01 // LEFT WING (IDEATION & SCRIPT)", 78, 172);

      AGENT_STAGES.slice(0, 5).forEach((ag, idx) => {
        const y = 232 + idx * 78;
        const st = curVideo?.stages?.[ag.key];
        const run = isStageRunning(st);
        const statusTxt = run ? "RUNNING" : (st?.status || "empty").toUpperCase();
        const col = run
          ? "#22d3ee"
          : st?.status === "approved"
          ? "#10b981"
          : st?.status === "draft"
          ? "#f59e0b"
          : st?.status === "stale"
          ? "#f43f5e"
          : "#64748b";

        wallCtx.fillStyle = ag.colorCss;
        wallCtx.beginPath();
        wallCtx.arc(88, y - 6, 6, 0, Math.PI * 2);
        wallCtx.fill();

        wallCtx.fillStyle = "#f1f5f9";
        wallCtx.font = '600 18px "Space Grotesk", sans-serif';
        wallCtx.fillText(`${ag.index + 1}. ${ag.name} (${ag.key})`, 106, y);

        wallCtx.fillStyle = col;
        wallCtx.font = '700 16px "JetBrains Mono", monospace';
        wallCtx.fillText(statusTxt, 435, y);
      });

      // Column 2: 9:16 Reels Monitor & Approval Status
      wallCtx.fillStyle = "rgba(9, 17, 32, 0.74)";
      wallCtx.fillRect(596, 130, 488, 505);
      wallCtx.strokeStyle = "rgba(59, 130, 246, 0.32)";
      wallCtx.strokeRect(596, 130, 488, 505);

      wallCtx.fillStyle = "#60a5fa";
      wallCtx.font = '700 20px "JetBrains Mono", monospace';
      wallCtx.fillText("02 // REELS 9:16 & GATE STATUS", 622, 172);

      wallCtx.strokeStyle = "rgba(34, 211, 238, 0.48)";
      wallCtx.strokeRect(736, 204, 208, 355);
      wallCtx.fillStyle = "rgba(13, 21, 38, 0.94)";
      wallCtx.fillRect(737, 205, 206, 353);

      wallCtx.fillStyle = "#22d3ee";
      wallCtx.font = '700 18px "Space Grotesk", sans-serif';
      wallCtx.fillText("1080 × 1920", 786, 280);

      const waitGate = curVideo?.waiting_approval;
      const waitReason = curVideo?.waiting_approval_reason;
      wallCtx.fillStyle = waitGate ? "#fbbf24" : "#10b981";
      wallCtx.font = '700 14px "JetBrains Mono", monospace';
      wallCtx.fillText(waitGate ? `GATE: ${waitGate.toUpperCase()}` : "ORCHESTRATOR READY", 756, 330);
      if (waitReason) {
        wallCtx.fillStyle = "#fb7185";
        wallCtx.fillText(waitReason.slice(0, 22), 752, 356);
      }

      for (let w = 0; w < 15; w++) {
        const h = 12 + Math.abs(Math.sin(t * 5 + w * 0.6)) * 28;
        wallCtx.fillStyle = "#38bdf8";
        wallCtx.fillRect(758 + w * 11, 468 - h / 2, 6, h);
      }

      // Column 3: Right Wing (Stages 6-10)
      wallCtx.fillStyle = "rgba(9, 17, 32, 0.74)";
      wallCtx.fillRect(1112, 130, 514, 505);
      wallCtx.strokeStyle = "rgba(139, 92, 246, 0.32)";
      wallCtx.strokeRect(1112, 130, 514, 505);

      wallCtx.fillStyle = "#a78bfa";
      wallCtx.font = '700 20px "JetBrains Mono", monospace';
      wallCtx.fillText("03 // RIGHT WING (AUDIT & RENDER)", 1138, 172);

      AGENT_STAGES.slice(5, 10).forEach((ag, idx) => {
        const y = 232 + idx * 78;
        const st = curVideo?.stages?.[ag.key];
        const run = isStageRunning(st);
        const statusTxt = run ? "RUNNING" : (st?.status || "empty").toUpperCase();
        const col = run
          ? "#22d3ee"
          : st?.status === "approved"
          ? "#10b981"
          : st?.status === "draft"
          ? "#f59e0b"
          : st?.status === "stale"
          ? "#f43f5e"
          : "#64748b";

        wallCtx.fillStyle = ag.colorCss;
        wallCtx.beginPath();
        wallCtx.arc(1148, y - 6, 6, 0, Math.PI * 2);
        wallCtx.fill();

        wallCtx.fillStyle = "#f1f5f9";
        wallCtx.font = '600 18px "Space Grotesk", sans-serif';
        wallCtx.fillText(`${ag.index + 1}. ${ag.name} (${ag.key})`, 1166, y);

        wallCtx.fillStyle = col;
        wallCtx.font = '700 16px "JetBrains Mono", monospace';
        wallCtx.fillText(statusTxt, 1492, y);
      });

      wallTexture.needsUpdate = true;
    }

    // Build 10 Hologram Humanoid Workstations
    function createLatheLimb(pairs, segs = 14) {
      return new THREE.LatheGeometry(
        pairs.map(([r, y]) => new THREE.Vector2(r, y)),
        segs
      );
    }

    const agentSceneEntities = [];
    const agentMeshesForRaycast = [];
    const orchestratorBeams = [];

    AGENT_STAGES.forEach((agent, idx) => {
      const stationPos = new THREE.Vector3(...agent.coords);
      const stationGroup = new THREE.Group();
      stationGroup.position.copy(stationPos);
      stationGroup.lookAt(0, 0, -0.5);
      scene.add(stationGroup);

      // Pedestal
      const pedestalBase = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.12, 0.14, 28), hullPanelMat);
      pedestalBase.position.y = 0.07;
      stationGroup.add(pedestalBase);

      const pedestalUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.86, 0.08, 28), hullTrimMat);
      pedestalUpper.position.y = 0.18;
      stationGroup.add(pedestalUpper);

      const emitterMat = new THREE.MeshBasicMaterial({
        color: agent.colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const emitterRing = new THREE.Mesh(new THREE.RingGeometry(0.73, 0.765, 28), emitterMat);
      emitterRing.rotation.x = -Math.PI / 2;
      emitterRing.position.y = 0.223;
      stationGroup.add(emitterRing);

      const stationAccentLight = new THREE.PointLight(agent.colorHex, 0.25, 3.2);
      stationAccentLight.position.set(0, 0.75, 0.25);
      stationGroup.add(stationAccentLight);

      // Console
      const consoleStand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.76, 0.18), hullTrimMat);
      consoleStand.position.set(0, 0.4, 0.86);
      consoleStand.rotation.x = -0.25;
      stationGroup.add(consoleStand);

      const miniHoloScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.76, 0.34),
        new THREE.MeshBasicMaterial({ color: agent.colorHex, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
      );
      miniHoloScreen.position.set(0, 0.84, 0.78);
      miniHoloScreen.rotation.x = -Math.PI / 2 + 0.42;
      stationGroup.add(miniHoloScreen);

      // Hybrid Hologram Figure
      const shellMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(agent.colorHex) },
          uTime: { value: 0 },
          uBoost: { value: 1.0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewPos;
          varying vec3 vWorldPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mvPos.xyz;
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uTime;
          uniform float uBoost;
          varying vec3 vNormal;
          varying vec3 vViewPos;
          varying vec3 vWorldPos;
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPos);
            float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 1.85);
            float scanline = 0.84 + 0.16 * sin(vWorldPos.y * 54.0 - uTime * 3.2);
            float verticalFade = smoothstep(0.18, 0.55, vWorldPos.y);
            float alpha = clamp((0.14 + fresnel * 0.65) * scanline * verticalFade * uBoost, 0.06, 0.92);
            vec3 finalCol = mix(uColor, vec3(0.88, 0.97, 1.0), fresnel * 0.42 * min(uBoost, 1.35));
            gl_FragColor = vec4(finalCol * min(uBoost, 1.3), alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });

      const wireMat = new THREE.MeshBasicMaterial({
        color: agent.colorHex,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      });
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.9 });

      const figRoot = new THREE.Group();
      figRoot.position.y = 0.22;
      stationGroup.add(figRoot);

      function addPart(geo, pos, rot = [0, 0, 0], parent = figRoot, scale = [1, 1, 1]) {
        const g = new THREE.Group();
        g.position.set(...pos);
        g.rotation.set(...rot);
        g.scale.set(...scale);
        g.add(new THREE.Mesh(geo, shellMat));
        const w = new THREE.Mesh(geo, wireMat);
        w.scale.setScalar(1.01);
        g.add(w);
        parent.add(g);
        return g;
      }

      const pelvisGeo = createLatheLimb([[0.06, -0.11], [0.16, -0.05], [0.19, 0.03], [0.16, 0.11]], 14);
      addPart(pelvisGeo, [0, 0.92, 0], [0, 0, 0], figRoot, [1.15, 1, 0.82]);

      const thighGeo = createLatheLimb([[0.06, -0.22], [0.08, -0.04], [0.09, 0.16], [0.085, 0.22]], 12);
      const calfGeo = createLatheLimb([[0.022, -0.23], [0.044, -0.08], [0.064, 0.1], [0.055, 0.22]], 12);
      [-0.12, 0.12].forEach((lx, lIdx) => {
        const sgn = lIdx === 0 ? -1 : 1;
        addPart(thighGeo, [lx, 0.7, 0.01], [0.02, 0, sgn * 0.045]);
        addPart(calfGeo, [lx * 1.15, 0.27, -0.01], [-0.04, 0, sgn * 0.02]);
      });

      const torso = new THREE.Group();
      torso.position.set(0, 1.34, 0);
      figRoot.add(torso);

      const torsoGeo = createLatheLimb(
        [[0.16, -0.31], [0.15, -0.15], [0.21, 0.04], [0.28, 0.24], [0.23, 0.35], [0.09, 0.4]],
        16
      );
      addPart(torsoGeo, [0, 0, 0], [0.03, 0, 0], torso, [1.15, 1, 0.74]);

      const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 1), coreMat);
      chestCore.position.set(0, 0.18, 0.15);
      torso.add(chestCore);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.61, 0.02);
      torso.add(headGroup);

      const headGeo = createLatheLimb(
        [[0.035, -0.13], [0.078, -0.08], [0.105, -0.01], [0.115, 0.06], [0.085, 0.12], [0.01, 0.14]],
        14
      );
      addPart(headGeo, [0, 0, 0], [0.04, 0, 0], headGroup, [0.94, 1, 1.1]);

      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.11, 0.032, 14, 1, true, -Math.PI * 0.34, Math.PI * 0.68),
        coreMat
      );
      visor.position.set(0, 0.015, 0.022);
      headGroup.add(visor);

      const upperArmGeo = createLatheLimb([[0.045, -0.15], [0.055, 0], [0.066, 0.14]], 10);
      const forearmGeo = createLatheLimb([[0.028, -0.15], [0.04, 0.02], [0.048, 0.14]], 10);

      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.34, 0.26, 0);
      torso.add(leftArmGroup);
      addPart(upperArmGeo, [-0.02, -0.14, 0], [0, 0, -0.08], leftArmGroup);
      addPart(forearmGeo, [-0.04, -0.42, 0.04], [-0.24, 0, 0.04], leftArmGroup);

      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.34, 0.26, 0);
      torso.add(rightArmGroup);
      addPart(upperArmGeo, [0.02, -0.14, 0], [0, 0, 0.08], rightArmGroup);
      addPart(forearmGeo, [0.04, -0.42, 0.04], [-0.24, 0, -0.04], rightArmGroup);

      // Specialty halo ring above each agent
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.24 + (idx % 3) * 0.04, 0.007, 8, idx % 2 === 0 ? 6 : 24),
        wireMat
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 2.18, 0);
      figRoot.add(halo);

      // Hitbox
      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 2.5, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = 1.3;
      hitMesh.userData = { type: "agent", agentIndex: idx };
      stationGroup.add(hitMesh);
      agentMeshesForRaycast.push(hitMesh);

      // Beam to Central Orchestrator
      const beamCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 1.45, 0),
        new THREE.Vector3(stationPos.x * 0.5, 0.22, stationPos.z * 0.5),
        new THREE.Vector3(stationPos.x, 1.15, stationPos.z)
      );
      const beamLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(beamCurve.getPoints(20)),
        new THREE.LineBasicMaterial({ color: agent.colorHex, transparent: true, opacity: 0.05 })
      );
      scene.add(beamLine);

      const pulseSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: agent.colorHex, transparent: true, opacity: 0 })
      );
      scene.add(pulseSphere);

      orchestratorBeams.push({
        curve: beamCurve,
        line: beamLine,
        pulse: pulseSphere,
        agent,
        speed: 0.34 + idx * 0.025,
        offset: idx * 0.15,
      });

      // 2D Pedestal Tag
      const tagEl = document.createElement("div");
      tagEl.className = "pedestal-tag";
      tagEl.style.borderColor = `${agent.colorCss}55`;
      tagEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500"></span><span style="color:${agent.colorCss}">${idx + 1}. ${agent.name}</span>`;
      tagEl.addEventListener("click", (e) => {
        e.stopPropagation();
        stateRef.current.onFocusAgent(idx);
      });

      const tagObj = new CSS2DObject(tagEl);
      tagObj.position.set(0, 0.16, 1.24);
      stationGroup.add(tagObj);

      // 2D Focus Card
      const focusCardEl = document.createElement("div");
      focusCardEl.className = "focus-agent-card";
      focusCardEl.style.border = `1px solid ${agent.colorCss}66`;
      focusCardEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const btn = e.target.closest("[data-action]");
        if (!btn || btn.disabled) return;
        const action = btn.getAttribute("data-action");
        if (action === "run") stateRef.current.onRunStage(agent.key);
        else if (action === "approve" && agent.approval) stateRef.current.onApprovePoint(agent.approval);
        else if (action === "open") stateRef.current.onOpenWorkspace(idx);
      });

      const focusCardObj = new CSS2DObject(focusCardEl);
      focusCardObj.position.set(1.42, 1.85, 0.25);
      focusCardObj.visible = false;
      stationGroup.add(focusCardObj);

      agentSceneEntities.push({
        agent,
        stationGroup,
        figure: { root: figRoot, shellMat, wireMat, torso, headGroup, leftArmGroup, rightArmGroup, chestCore, halo },
        emitterRing,
        emitterMat,
        stationAccentLight,
        tagEl,
        tagObj,
        focusCardEl,
        focusCardObj,
      });
    });

    entitiesRef.current = agentSceneEntities;

    // Raycast & Resize
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onMouseMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (stateRef.current.isSleepMode) return;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(agentMeshesForRaycast);
      document.body.style.cursor = hits.length > 0 ? "pointer" : "default";
    };

    const onClick = (e) => {
      if (e.target.closest("header, nav, .pedestal-tag, .focus-agent-card, [data-modal]")) return;
      if (stateRef.current.isSleepMode) return;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...agentMeshesForRaycast, commandWallMesh]);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        if (hitData.type === "agent") stateRef.current.onFocusAgent(hitData.agentIndex);
        else if (hitData.type === "wall") stateRef.current.onFocusAgent("wall");
      }
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);

    // Animation Loop (pauses rendering when Sleep Mode is active to save RAM 8 GB & CPU)
    const clock = new THREE.Clock();
    let lastWallDraw = 0;
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let rafId = null;

    function animate() {
      rafId = requestAnimationFrame(animate);
      if (stateRef.current.isSleepMode) return;

      const t = clock.getElapsedTime();
      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        stateRef.current.onFpsUpdate?.(frameCount);
        frameCount = 0;
        lastFpsTime = now;
      }

      if (camRig.isTransitioning) {
        camera.position.lerp(camRig.targetPos, 0.08);
        controls.target.lerp(camRig.targetLookAt, 0.09);
        if (camera.position.distanceTo(camRig.targetPos) < 0.03) {
          camRig.isTransitioning = false;
        }
      }
      controls.update();

      orchCoreGroup.position.y = 1.68 + Math.sin(t * 1.1) * 0.06;
      coreNucleus.rotation.y = t * 0.35;
      innerCrystal.rotation.y = -t * 0.28;
      orchRings.forEach((r, idx) => {
        r.rotation.z += (idx % 2 === 0 ? 1 : -1) * 0.003;
      });

      const curVideo = stateRef.current.video;
      const curFocus = stateRef.current.focusedIndex;

      agentSceneEntities.forEach((ent, idx) => {
        const st = curVideo?.stages?.[ent.agent.key];
        const isWorking = isStageRunning(st);
        const isSelected = curFocus === idx;
        const fig = ent.figure;

        fig.root.position.y = 0.16 + Math.sin(t * 1.55 + idx * 1.1) * 0.035;
        fig.torso.rotation.x = 0.02 + Math.sin(t * 1.55 + idx) * 0.018;
        fig.halo.rotation.z = t * (isWorking || isSelected ? 0.9 : 0.25);

        const targetBoost = isSelected ? 1.48 : isWorking ? 1.2 : 0.96;
        fig.shellMat.uniforms.uBoost.value += (targetBoost - fig.shellMat.uniforms.uBoost.value) * 0.12;
        fig.wireMat.opacity = isSelected ? 0.34 : 0.19;
        fig.shellMat.uniforms.uTime.value = t;

        if (isWorking) {
          fig.leftArmGroup.rotation.x = -0.26 + Math.sin(t * 3.1 + idx) * 0.14;
          fig.rightArmGroup.rotation.x = -0.26 + Math.cos(t * 3.1 + idx) * 0.14;
        } else {
          fig.leftArmGroup.rotation.x = Math.sin(t * 1.35 + idx) * 0.04;
          fig.rightArmGroup.rotation.x = -Math.sin(t * 1.35 + idx) * 0.04;
        }

        const targetLight = isSelected ? 0.68 : isWorking ? 0.4 : 0.22;
        ent.stationAccentLight.intensity += (targetLight - ent.stationAccentLight.intensity) * 0.12;
        ent.emitterMat.opacity = isSelected ? 0.85 : 0.48 + Math.sin(t * 2.0 + idx) * 0.08;
      });

      orchestratorBeams.forEach((b, bIdx) => {
        const st = curVideo?.stages?.[b.agent.key];
        const active = isStageRunning(st) || curFocus === bIdx;
        b.line.material.opacity = active ? 0.3 : 0.04;
        b.pulse.material.opacity = active ? 0.8 : 0.0;
        if (active) {
          const prog = (t * (b.speed * 1.35) + b.offset) % 1;
          const pingPong = prog < 0.5 ? prog * 2 : (1 - prog) * 2;
          b.pulse.position.copy(b.curve.getPoint(pingPong));
        }
      });

      if (t - lastWallDraw > 0.2) {
        drawCommandWall(t);
        lastWallDraw = t;
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }

    drawCommandWall(0);
    animate();

    // Cleanup WebGL & DOM saat unmount (menghemat memori RAM 8 GB)
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === webglContainer) {
        webglContainer.removeChild(renderer.domElement);
      }
      if (labelRenderer.domElement.parentNode === css2dContainer) {
        css2dContainer.removeChild(labelRenderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div ref={webglRef} className="fixed inset-0 w-full h-full z-0" />
      <div ref={css2dRef} className="fixed inset-0 w-full h-full z-10 pointer-events-none" />
    </>
  );
}