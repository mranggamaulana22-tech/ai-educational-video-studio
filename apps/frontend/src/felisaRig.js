/**
 * felisaRig — rig 2.5D berlayer untuk Felisa (WebGL murni, tanpa dependency).
 *
 * Layer (urut gambar): base, hairback, face, iris, lid, mulut-dalam, lowerlip, bangs, vignette.
 * Tiap layer bergerak sendiri: rambut belakang (lambat), wajah, poni (paling cepat) -> paralaks kedalaman.
 * Kedip = kelopak turun dari atas; iris mengikuti kursor di dalam bukaan mata; mulut membuka
 * dengan bibir bawah turun + rongga mulut; rambut panjang dan badan bergerak lewat warp di shader.
 *
 * createFelisaRig(canvas, urls, meta, opts) -> controller
 *   urls: { base, hairback, face, iris, lid, lowerlip, bangs, aperture, vignette }  (URL / data URI PNG)
 *   meta: isi layers/meta.json  ({ LIPLINE, EYES })
 *   controller.set({ speaking, level, glowMode, amp, fps, sleep, hidden:{layerName:true} })
 *   controller.blink(), controller.pulse(), controller.dispose(), controller.ready (Promise)
 */
export function createFelisaRig(canvas, urls, meta, opts = {}) {
  const W = 460, H = 605, PIV = [232, 250];
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) return { failed: true, set() {}, blink() {}, pulse() {}, dispose() {}, ready: Promise.resolve(false) };

  const f = (n) => Number(n).toFixed(4);
  const L = meta.LIPLINE, E = meta.EYES;
  let lipFn = "float lipY(float x){\n";
  for (let i = 0; i < L.length - 1; i++) {
    lipFn += `  ${i ? "else " : ""}if(x<${f(L[i + 1][0])}) return mix(${f(L[i][1])},${f(L[i + 1][1])},clamp((x-${f(L[i][0])})/${f(L[i + 1][0] - L[i][0])},0.0,1.0));\n`;
  }
  lipFn += `  return ${f(L[L.length - 1][1])};\n}`;
  const eyeConst = (k, e) => `const vec4 E${k}=vec4(${f(e.c[0])},${f(e.c[1])},${f(e.rx)},${f(e.ry)}); const float T${k}=${f((e.tilt * Math.PI) / 180)};`;

  const VERT = `
attribute vec2 a_pos;
uniform vec2 u_size, u_off, u_piv, u_canvas;
uniform vec3 u_view;
uniform float u_rot;
varying vec2 v_uv;
void main(){
  vec2 p=a_pos*u_size;
  float c=cos(u_rot), s=sin(u_rot);
  vec2 d=p-u_piv;
  p=u_piv+vec2(c*d.x-s*d.y, s*d.x+c*d.y)+u_off;
  vec2 sc=p*u_view.x+u_view.yz;
  gl_Position=vec4(sc.x/u_canvas.x*2.0-1.0, 1.0-sc.y/u_canvas.y*2.0, 0.0, 1.0);
  v_uv=a_pos;
}`;

  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_tex, u_aux;
uniform vec2 u_size, u_shift;
uniform vec2 u_expr; uniform float u_fx, u_w;
uniform float u_mode, u_warp, u_time, u_breath, u_amp, u_glow, u_lid, u_gap;
${eyeConst("L", E.L)}
${eyeConst("R", E.R)}
${lipFn}
float eyeReveal(vec2 p, vec4 e, float tilt, out float line){
  vec2 d=p-e.xy; float ca=cos(tilt), sa=sin(tilt);
  float qx=ca*d.x+sa*d.y;
  float qy=-sa*d.x+ca*d.y;
  float ryb=e.w*1.55;
  float u=clamp(qx/(e.z*1.18),-1.0,1.0);
  float arc=0.10*(1.0-u*u)*smoothstep(0.0,0.5,u_lid);
  float tc=(qy+ryb)/(2.0*ryb)-arc;
  float w=0.8/(2.0*ryb);
  line=exp(-pow((tc-min(u_lid,0.62))/w,2.0))*step(0.03,u_lid)*(1.0-smoothstep(0.8,1.0,abs(u)));
  return 1.0-smoothstep(u_lid-0.04,u_lid+0.02,tc);
}
void main(){
  vec2 px=v_uv*u_size;
  if(u_mode>3.5){ gl_FragColor=vec4(0.0,0.0,0.0,texture2D(u_tex,v_uv).a); return; }
  if(u_mode>1.5 && u_mode<2.5){
    float yl=lipY(px.x);
    float yy=(px.y-yl)/max(u_gap,0.05);
    float env=sqrt(max(0.0,1.0-pow((px.x-223.5)/21.0,2.0)));
    float a=step(0.0,yy)*step(yy,1.0)*step(203.0,px.x)*step(px.x,244.0);
    a*=smoothstep(0.0,0.35,env)*smoothstep(0.15,0.7,u_gap)*smoothstep(0.0,0.12,yy)*(1.0-smoothstep(0.9,1.0,yy));
    vec3 col=mix(vec3(0.27,0.06,0.09),vec3(0.52,0.20,0.22),clamp(yy,0.0,1.0));
    gl_FragColor=vec4(col*a,a); return;
  }
  vec2 sp=px;
  if(u_warp>0.5){
    float sw=smoothstep(240.0,330.0,sp.y);
    sp.y-=u_breath*u_amp*0.0055*(sp.y-230.0)*sw;
    sp.x-=u_breath*u_amp*0.003*(sp.x-230.0)*sw;
    float wl=(1.0-smoothstep(100.0,140.0,sp.x))*smoothstep(150.0,260.0,sp.y)*(1.0-smoothstep(400.0,470.0,sp.y));
    float wr=smoothstep(385.0,420.0,sp.x)*smoothstep(200.0,300.0,sp.y)*(1.0-smoothstep(430.0,500.0,sp.y));
    sp.x+=(sin(u_time*1.3+sp.y*0.03)*1.6+sin(u_time*0.7+sp.y*0.012+1.7)*1.3)*(wl+wr)*u_amp;
  }
  if(u_fx>0.5){
    float sm=u_expr.x, br=u_expr.y;
    float cn=smoothstep(6.0,30.0,abs(px.x-224.0));
    float wy=exp(-pow((px.y-202.0)/10.0,2.0));
    float inMouth=1.0-smoothstep(36.0,52.0,abs(px.x-224.0));
    sp.y+=sm*3.4*cn*wy*inMouth;
    sp.x+=sm*(px.x-224.0)*0.07*wy*inMouth;
    float ch=exp(-pow((px.y-182.0)/14.0,2.0))*smoothstep(14.0,34.0,abs(px.x-226.0))*(1.0-smoothstep(52.0,70.0,abs(px.x-226.0)));
    sp.y+=max(sm,0.0)*2.0*ch;
    float wb=exp(-pow((px.y-134.0)/9.0,2.0))*smoothstep(162.0,180.0,px.x)*(1.0-smoothstep(268.0,288.0,px.x));
    sp.y+=br*4.2*wb;
  }
  vec4 c=texture2D(u_tex,(sp-u_shift)/u_size);
  if(u_mode>2.5 && u_mode<3.5){ c*=texture2D(u_aux,v_uv).a; }
  if(u_mode>0.5 && u_mode<1.5){
    float l1,l2;
    float r=max(eyeReveal(px,EL,TL,l1), eyeReveal(px,ER,TR,l2))*step(0.03,u_lid);
    float ln=max(l1,l2);
    vec3 rgb=c.rgb/max(c.a,0.001);
    float a=max(c.a*r, c.a*ln*0.9);
    rgb=mix(rgb,vec3(0.17,0.10,0.11),clamp(ln,0.0,1.0));
    gl_FragColor=vec4(rgb*a,a); return;
  }
  vec3 un=c.rgb/max(c.a,0.001);
  float cy=smoothstep(0.25,0.65,min(un.g,un.b)-un.r);
  c.rgb+=vec3(0.05,0.95,0.85)*cy*u_glow*0.55*c.a;
  gl_FragColor=c*u_w;
}`;

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return { failed: true, set() {}, blink() {}, pulse() {}, dispose() {}, ready: Promise.resolve(false) };
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ["u_size","u_off","u_piv","u_canvas","u_view","u_rot","u_tex","u_aux","u_shift","u_mode","u_warp","u_time","u_breath","u_amp","u_glow","u_lid","u_gap","u_expr","u_fx","u_w"]
    .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  gl.uniform2f(U.u_size, W, H);
  gl.uniform2f(U.u_piv, PIV[0], PIV[1]);
  gl.uniform1i(U.u_tex, 0);
  gl.uniform1i(U.u_aux, 1);
  gl.enable(gl.BLEND);

  const tex = {};
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });

  const P = { speaking: false, level: undefined, glowMode: "normal", amp: 1, fps: 30, sleep: false, hidden: {} };
  const R = { vNext: 0, vIdx: "a", w: {}, smile: 0, brow: 0, browKick: 0, pulseAt: -99, blinkStart: -99, blinkAt: 2.5, talk: 0, glow: 0.15, lastMove: -99, nextGlance: 0, gx: 0, gy: 0, mood: 0, droop: 0, lean: 0 };
  const ecur = { x: 0, y: 0 };
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const t0 = performance.now() / 1000;
  const now = () => performance.now() / 1000 - t0;
  let ready = false, raf = 0, disposed = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    R.lastMove = now();
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const bindTex = (name, unit = 0) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex[name]); };
  const layer = (name, o) => {
    if (P.hidden[name]) return;
    bindTex(o.tex || name, 0);
    if (o.aux) bindTex(o.aux, 1);
    gl.uniform2f(U.u_off, o.off ? o.off[0] : 0, o.off ? o.off[1] : 0);
    gl.uniform1f(U.u_rot, o.rot || 0);
    gl.uniform2f(U.u_shift, o.shift ? o.shift[0] : 0, o.shift ? o.shift[1] : 0);
    gl.uniform1f(U.u_mode, o.mode || 0);
    gl.uniform1f(U.u_warp, o.warp ? 1 : 0);
    gl.uniform1f(U.u_fx, o.fx ? 1 : 0);
    gl.uniform1f(U.u_w, o.w == null ? 1 : o.w);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const draw = (t) => {
    if (t > R.blinkAt) { R.blinkStart = t; R.blinkAt = Math.random() < 0.25 ? t + 0.32 : t + 2.2 + Math.random() * 3.8; }
    const bp = (t - R.blinkStart) / 0.17;
    let lid = bp >= 0 && bp <= 1 ? Math.pow(Math.sin(bp * Math.PI), 0.7) : 0;
    if (P.lidOverride != null) lid = P.lidOverride;

    if (t - R.lastMove > 3) {
      if (t > R.nextGlance) {
        R.gx = (Math.random() * 2 - 1) * 0.8; R.gy = (Math.random() * 2 - 1) * 0.45;
        if (Math.random() < 0.3) { R.gx = 0; R.gy = 0; }
        R.nextGlance = t + 1.0 + Math.random() * 2.6;
        if (Math.random() < 0.5) R.browKick = 0.5;
        if (Math.random() < 0.4 && t > R.blinkAt - 1.2) R.blinkAt = t + 0.12;
      }
      target.x = R.gx + Math.sin(t * 0.7) * 0.06; target.y = R.gy + Math.sin(t * 0.5) * 0.05;
    }
    ecur.x += (target.x - ecur.x) * 0.28; ecur.y += (target.y - ecur.y) * 0.28;
    cur.x += (ecur.x - cur.x) * 0.06; cur.y += (ecur.y - cur.y) * 0.06;

    const want = P.speaking ? (P.level != null ? P.level : 0.5 + 0.5 * Math.sin(t * 13) * Math.sin(t * 5.3)) : 0;
    R.talk += (Math.max(0, want) - R.talk) * 0.35;

    const ev = Math.max(0, 1 - (t - R.pulseAt) / 0.9);
    const base = P.glowMode === "flicker" ? (Math.sin(t * 23) * Math.sin(t * 7.1) > 0.9 ? 0.6 : 0.04)
               : P.glowMode === "calm" ? 0.2 + 0.08 * Math.sin(t * 1.2)
               : 0.18 + 0.1 * Math.sin(t * 1.2);
    R.glow += (base + ev * 0.8 + R.talk * 0.5 - R.glow) * 0.2;

    const a = P.amp;
    const gm = P.glowMode;
    R.lean += ((gm === "calm" ? 1 : 0) - R.lean) * 0.04;
    R.droop += ((gm === "flicker" ? 1 : 0) - R.droop) * 0.04;
    const br = Math.sin(t * (gm === "flicker" ? 0.9 : 1.5));
    const nod = R.talk * Math.sin(t * 7.3) * 1.4 + R.talk * 0.8 * Math.sin(t * 3.1);
    const bounce = Math.max(0, 1 - (t - R.pulseAt) / 0.5);
    const bounceY = -Math.sin(bounce * Math.PI) * 3.2 * bounce;
    const sway = Math.sin(t * 0.6) * 0.016 + Math.sin(t * 0.37 + 2) * 0.01;
    const tilt = sway + R.lean * (0.035 + 0.01 * Math.sin(t * 0.9)) - R.droop * 0.03 + R.talk * Math.sin(t * 4.1) * 0.012;
    const dy = nod + bounceY + R.droop * 3.2 + R.lean * -0.8 + (R.droop > 0.5 && Math.sin(t * 23) * Math.sin(t * 7.1) > 0.9 ? 1.2 : 0);
    const head = (g, rg) => ({
      off: [cur.x * 6.0 * g * a + sway * 40 * g * a, cur.y * 4.2 * g * a + br * 1.1 * g * a + dy * g * a],
      rot: (cur.x * 0.05 + tilt) * rg * a,
    });
    const hasExpr = !!urls.e_happy;
    const ex = P.expr || {};
    const smT = (ex.smile != null ? ex.smile : (gm === "flicker" ? -0.7 : gm === "calm" ? 0.2 : 0.55)) + Math.sin(t * 0.45) * 0.12 + R.talk * 0.15;
    const brT = (ex.brow != null ? ex.brow : (gm === "flicker" ? -0.45 : gm === "calm" ? 0.45 : 0.1)) + R.browKick + R.talk * Math.max(0, Math.sin(t * 2.3)) * 0.5;
    R.smile += (smT - R.smile) * 0.08; R.brow += (brT - R.brow) * 0.15;
    R.browKick *= 0.92;
    const tg = { happy: 0, concerned: 0, thinking: 0, surprised: 0, a: 0, o: 0, e: 0 };
    if (P.expr && P.expr.mood) tg[P.expr.mood] = 1;
    else if (gm === "flicker") tg.concerned = 1;
    else if (gm === "calm") { const ph = (t % 7) / 7; if (ph > 0.3 && ph < 0.62) tg.thinking = 0.85; else tg.happy = 0.18; }
    else tg.happy = P.speaking ? 0.12 : 0.4 + 0.2 * Math.sin(t * 0.5);
    if (P.speaking && R.talk > 0.12) {
      if (t > R.vNext) { const o = ["a", "e", "a", "o", "e", "a"]; R.vIdx = o[Math.floor(Math.random() * o.length)]; R.vNext = t + 0.08 + Math.random() * 0.09; }
      tg[R.vIdx] = Math.min(1, R.talk * 1.5);
    }
    if (ev > 0) { for (const k in tg) tg[k] *= 1 - ev * 0.95; tg.surprised = ev * 0.95; }
    const rate = { concerned: 0.07, thinking: 0.1, happy: 0.08, surprised: 0.35, a: 0.4, o: 0.4, e: 0.4 };
    let sum = 0;
    for (const k in tg) { R.w[k] = (R.w[k] || 0) + (tg[k] - (R.w[k] || 0)) * rate[k]; sum += R.w[k]; }
    const nrm = sum > 1 ? 1 / sum : 1;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / W, ch / H);
    gl.uniform2f(U.u_canvas, cw, ch);
    gl.uniform3f(U.u_view, s, (cw - W * s) / 2, 0);
    gl.uniform1f(U.u_time, t); gl.uniform1f(U.u_breath, br); gl.uniform1f(U.u_amp, a);
    gl.uniform2f(U.u_expr, R.smile * a, R.brow * a); gl.uniform1f(U.u_glow, R.glow); gl.uniform1f(U.u_lid, lid); gl.uniform1f(U.u_gap, hasExpr ? 0 : R.talk * 5.0);

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const hb = head(0.55, 0.8), fc = head(1.0, 1.0), bg = head(1.4, 1.1);
    const irisShift = [ecur.x * 1.6 * a, ecur.y * 1.0 * a];
    layer("base", { warp: true });
    layer("hairback", { ...hb, warp: true });
    const fx = { ...fc };
    layer("face", fx);
    layer("iris", { ...fx, shift: irisShift, mode: 3, aux: "aperture" });
    if (!hasExpr) layer("lid", { ...fx, mode: 1 });
    layer("mouth", { ...fx, tex: "lowerlip", mode: 2 });
    layer("lowerlip", { ...fx, shift: [0, hasExpr ? 0 : R.talk * 5.0] });
    if (hasExpr) {
      for (const k in R.w) if (R.w[k] * nrm > 0.01) layer("e_" + k, { ...fc, w: R.w[k] * nrm });
      const W_ = (k) => (R.w[k] || 0) * nrm;
      const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      if (urls.e_lookL) {
        const gz = ecur.x * (P.speaking ? 0.45 : 1) * Math.min(1, a);
        const gate = Math.max(0, Math.min(1, 1 - W_("surprised") - W_("happy") * 0.6 - (W_("a") + W_("o") + W_("e")) * 0.8 - W_("thinking") * 0.5 - W_("concerned") * 0.2)) * (1 - Math.min(1, lid * 1.5));
        const wR = Math.max(0, Math.min(1, (gz - 0.1) * 1.9)) * gate, wL = Math.max(0, Math.min(1, (-gz - 0.1) * 1.9)) * gate;
        if (wR > 0.01) layer("e_lookR", { ...fc, w: wR });
        if (wL > 0.01) layer("e_lookL", { ...fc, w: wL });
      }
      if (lid > 0.02) {
        const cl = sm(0.45, 0.9, lid), hf = urls.e_half ? sm(0.08, 0.5, lid) * (1 - cl) : 0;
        if (hf > 0.01) layer("e_half", { ...fc, w: hf });
        layer("e_eyes", { ...fc, w: urls.e_half ? cl : Math.min(1, lid * 1.15) });
      }
    }
    layer("bangs", bg);
    gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
    layer("vignette", { mode: 4 });
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return R.talk;
  };

  let last = 0, frames = 0, tick = performance.now();
  const loop = (ms) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (P.sleep || document.hidden || !ready) return;
    if (ms - last < 1000 / P.fps) return;
    last = ms; frames++;
    const talk = draw(now());
    if (opts.onFrame) opts.onFrame(talk);
    if (ms - tick >= 1000) { if (opts.onFps) opts.onFps(Math.round((frames * 1000) / (ms - tick))); frames = 0; tick = ms; }
  };

  const kick = () => { if (ready) { resize(); draw(now()); } };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(kick) : null;
  if (ro) ro.observe(canvas);

  const names = Object.keys(urls);
  const readyP = Promise.all(names.map((n) => loadImg(urls[n]).then((img) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    tex[n] = t;
  }))).then(() => {
    if (disposed) return false;
    ready = true; kick();
    raf = requestAnimationFrame(loop);
    return true;
  });

  return {
    failed: false,
    ready: readyP,
    set(p) { Object.assign(P, p); kick(); },
    blink() { R.blinkStart = now(); kick(); },
    pulse() { R.pulseAt = now(); R.browKick = 0.9; kick(); },
    redraw: kick,
    dispose() {
      disposed = true; cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      Object.values(tex).forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf); gl.deleteProgram(prog);
      const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
    },
  };
}
