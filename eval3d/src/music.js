// 自動播放的背景配樂：以瀏覽器 Web Audio 即時合成（不使用音檔，沒有版權問題）
// 柔和的長音和弦墊底，加上五聲音階的輕敲鈴音，經過簡單的殘響，音量偏低
export function createMusic() {
  let ctx = null, master = null, wet = null, dry = null, timer = null, running = false;
  let nextChord = 0, nextNote = 0, chordIx = 0, lastNote = 7;
  const VOL = 0.5;
  // D 大調五聲音階（D E F# A B），MIDI 音高
  const SCALE = [50, 52, 54, 57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81];
  // 和弦進行：D(add9) → Bm7 → G(add9) → A(sus2)，每個 9 秒
  const CHORDS = [[38, 50, 57, 64, 66], [35, 47, 54, 57, 62], [31, 43, 50, 57, 59], [33, 45, 52, 57, 59]];
  const CHORD_LEN = 9;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    // 殘響：以衰減的雜訊產生脈衝響應
    const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = 0.55; dry = ctx.createGain(); dry.gain.value = 0.7;
    wet.connect(conv); conv.connect(master); dry.connect(master);
    return true;
  }
  function out(node) { node.connect(dry); node.connect(wet); }

  function pad(chord, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850; lp.Q.value = 0.3;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 3); g.gain.setValueAtTime(0.06, t + CHORD_LEN - 0.5); g.gain.linearRampToValueAtTime(0, t + CHORD_LEN + 3);
    lp.connect(g); out(g);
    chord.forEach((m, i) => {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = hz(m); o.detune.value = det;
        const vg = ctx.createGain(); vg.gain.value = i === 0 ? 0.9 : 0.35;
        o.connect(vg); vg.connect(lp); o.start(t); o.stop(t + CHORD_LEN + 3.2);
      }
    });
  }
  function bell(m, t, v) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
    out(g);
    [[1, 1], [2, 0.18], [3.01, 0.06]].forEach(([mul, a]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m) * mul;
      const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(g);
      o.start(t); o.stop(t + 3.3);
    });
  }
  function pickNote() {
    // 小步走動為主，偏向目前和弦的音
    const chordPcs = CHORDS[chordIx % CHORDS.length].map((m) => m % 12);
    for (let k = 0; k < 6; k++) {
      const step = [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
      const ix = Math.max(3, Math.min(SCALE.length - 1, lastNote + step));
      if (chordPcs.includes(SCALE[ix] % 12) || k > 3) { lastNote = ix; return SCALE[ix]; }
    }
    return SCALE[lastNote];
  }
  function schedule() {
    const ahead = ctx.currentTime + 1.2;
    while (nextChord < ahead) { pad(CHORDS[chordIx % CHORDS.length], nextChord); chordIx++; nextChord += CHORD_LEN; }
    while (nextNote < ahead) {
      if (Math.random() < 0.78) bell(pickNote(), nextNote, 0.05 + Math.random() * 0.03);
      nextNote += [0.9, 1.2, 1.2, 1.8, 2.4][Math.floor(Math.random() * 5)];
    }
  }
  function start() {
    if (running) return;
    if (!ctx && !init()) return;
    running = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(VOL, t + 2.5);
    nextChord = Math.max(nextChord, t + 0.05); nextNote = Math.max(nextNote, t + 1.5);
    schedule(); clearInterval(timer); timer = setInterval(schedule, 250);
  }
  function stop() {
    if (!running) return;
    running = false;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.5);
    clearInterval(timer); timer = null;
    setTimeout(() => { if (running) return; if (ctx.state === 'running') ctx.suspend().catch(() => {}); nextChord = 0; nextNote = 0; }, 3500);
  }
  // 瀏覽器規定要有使用者操作後才能出聲；網址直接帶 #play 開始時，等第一次點擊或按鍵再出聲
  function unlock() { if (ctx && ctx.state === 'suspended' && running) ctx.resume().catch(() => {}); }
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  return { start, stop, get running() { return running; }, get blocked() { return !!ctx && ctx.state === 'suspended' && running; } };
}
