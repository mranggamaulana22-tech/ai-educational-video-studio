import { useEffect, useRef } from "react";
import { createFelisaRig } from "./felisaRig";
import meta from "./layers/meta.json";

/**
 * FelisaLayered — Felisa 2.5D berlayer (WebGL, tanpa dependency).
 *
 * Letakkan PNG layer di public/models/felisa/layers/ (base, hairback, face, iris, lid,
 * lowerlip, bangs, aperture, vignette) dan meta.json di src/layers/.
 *
 * Props:
 *  speaking  true saat Felisa bicara (mulut membuka, glow berdenyut)
 *  level     0..1 level suara (opsional)
 *  pulse     naikkan angkanya tiap ada event /events untuk memicu denyut glow
 *  sleep     true = render berhenti (Sleep Mode, hemat RAM/CPU)
 *  glowMode  "normal" | "calm" (menunggu) | "flicker" (gagal)
 *  mood      null | "happy" | "concerned" | "thinking" | "surprised" (paksa ekspresi; null = otomatis dari glowMode)
 *  amp       kekuatan gerak 0..2, fps batas frame rate
 */
export const FELISA_NATIVE_WIDTH = 460;
export const FELISA_NATIVE_HEIGHT = 605;

export const FELISA_V2_LAYERS = ["base", "hairback", "face", "iris", "lid", "lowerlip", "bangs", "aperture", "vignette",
  "e_happy", "e_concerned", "e_thinking", "e_surprised", "e_a", "e_o", "e_e", "e_eyes", "e_half", "e_lookL", "e_lookR"];

export default function FelisaLayered({
  baseUrl = "/models/felisa/layers",
  speaking = false, level, pulse = 0, sleep = false,
  glowMode = "normal", mood = null, amp = 1, fps = 30,
  className, style, onStatus, opacity = 1,
}) {
  const canvasRef = useRef(null);
  const rigRef = useRef(null);
  const firstPulse = useRef(true);

  useEffect(() => {
    let disposed = false;

    const loadLayer = (name) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({
        name,
        url: `${baseUrl}/${name}.png`,
        width: FELISA_NATIVE_WIDTH,
        height: FELISA_NATIVE_HEIGHT,
      });
      image.onerror = () => resolve({ name, url: null });
      image.src = `${baseUrl}/${name}.png`;
    });

    Promise.all(FELISA_V2_LAYERS.map(loadLayer)).then((results) => {
      if (disposed) return;

      const loaded = results.filter((item) => item.url);
      const failed = results.filter((item) => !item.url).map((item) => item.name);
      const urls = Object.fromEntries(loaded.map((item) => [item.name, item.url]));
      const rig = createFelisaRig(canvasRef.current, urls, meta, { fps });
      rigRef.current = rig;
      rig.ready.then((ready) => {
        if (!disposed) {
          onStatus?.({
            activeCount: ready ? loaded.length : 0,
            totalCount: FELISA_V2_LAYERS.length,
            failedNames: failed,
            width: FELISA_NATIVE_WIDTH,
            height: FELISA_NATIVE_HEIGHT,
          });
        }
      });
    });

    return () => {
      disposed = true;
      rigRef.current?.dispose();
      rigRef.current = null;
    };
  }, [baseUrl, onStatus]);

  useEffect(() => {
    rigRef.current?.set({
      speaking,
      level: level == null ? 0.5 : Math.max(0, Math.min(1, level)),
      sleep,
      glowMode,
      amp,
      fps,
      expr: mood ? { mood } : undefined,
    });
  }, [speaking, level, sleep, glowMode, mood, amp, fps]);

  useEffect(() => {
    if (firstPulse.current) { firstPulse.current = false; return; }
    rigRef.current?.pulse();
  }, [pulse]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Potret berlapis Felisa"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "600px",
        aspectRatio: `${FELISA_NATIVE_WIDTH} / ${FELISA_NATIVE_HEIGHT}`,
        display: "block",
        opacity,
        WebkitMaskImage: "radial-gradient(ellipse 50% 54% at 50% 46%, #000 58%, transparent 100%)",
        maskImage: "radial-gradient(ellipse 50% 54% at 50% 46%, #000 58%, transparent 100%)",
        ...style,
      }}
    />
  );
}
