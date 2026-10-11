import { samplingPlan } from '/frame-animation-core.mjs';

// Capture one immutable sequence. drawFrame supplies the actual scene at the
// requested timestamp; the exact same bitmap is saved as PNG input and video.
export async function captureCanvasSequence({ canvas, duration, fps = 12, drawFrame, shouldCancel = () => false, onFrame = () => {}, videoBitsPerSecond = 3000000, terminalHoldMs = 60 } = {}) {
  if (!canvas?.captureStream || typeof drawFrame !== 'function' || !globalThis.MediaRecorder) throw new Error('浏览器不支持 Canvas MediaRecorder 拍摄');
  if (!Number.isFinite(duration) || duration <= 0 || duration > 60 || !Number.isFinite(fps) || fps < 1 || fps > 30) throw new Error('拍摄支持 0–60 秒、1–30 FPS');
  const plan = samplingPlan({ duration, fps });
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
  if (!mimeType) throw new Error('没有可用的视频编码器');
  const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
  if (typeof track?.requestFrame !== 'function') { stream.getTracks().forEach(t => t.stop()); throw new Error('浏览器不支持 Canvas requestFrame，请使用 Chrome'); }
  const context = canvas.getContext('2d'), recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond }), chunks = [], frames = [];
  const complete = new Promise((resolve, reject) => {
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = resolve;
    recorder.onerror = e => reject(new Error(e.error?.message || '视频编码失败'));
  });
  const wait = async deadline => { const ms = deadline - performance.now(); if (ms > 0) await new Promise(r => setTimeout(r, ms)); };
  let started, terminalRequestElapsedMs = null;
  try {
    recorder.start(); started = performance.now();
    for (const [index, sample] of plan.entries()) {
      if (shouldCancel()) break;
      await wait(started + sample.sourceTime * 1000);
      if (shouldCancel()) break;
      const meta = await drawFrame({ canvas, context, sample, timeSeconds: sample.sourceTime, index }) || {};
      const bitmap = canvas.ownerDocument.createElement('canvas'); bitmap.width = canvas.width; bitmap.height = canvas.height; bitmap.getContext('2d').drawImage(canvas, 0, 0);
      const frame = { ...meta, ...sample, width: canvas.width, height: canvas.height, image: bitmap, requestedTimeMs: sample.sourceTime * 1000, actualRequestElapsedMs: performance.now() - started };
      frames.push(frame); track.requestFrame(); await onFrame(frame, index, plan.length);
    }
    if (!shouldCancel() && frames.length) {
      await wait(started + duration * 1000);
      context.drawImage(frames.at(-1).image, 0, 0); terminalRequestElapsedMs = performance.now() - started; track.requestFrame();
      await new Promise(r => setTimeout(r, terminalHoldMs));
    }
    recorder.stop(); await complete;
    const movie = new Blob(chunks, { type: mimeType });
    if (!movie.size || !frames.length) throw new Error('拍摄未产生视频或帧图');
    return { movie, frames, mimeType, extension: mimeType.startsWith('video/webm') ? 'webm' : 'mp4', receipt: {
      requestedFPS: fps, requestedDuration: duration, requestedFrameCount: plan.length, capturedFrameCount: frames.length, actualElapsedSeconds: (performance.now() - started) / 1000, terminalRequestElapsedMs, cancelled: shouldCancel(),
      encodingTiming: 'captureStream(0) + one requestFrame per immutable PNG bitmap, plus terminal hold; MediaRecorder PTS are real wall-clock and require FFprobe verification',
      timingSamples: frames.map(f => ({ requestedTimeMs: f.requestedTimeMs, actualRequestElapsedMs: f.actualRequestElapsedMs, latenessMs: f.actualRequestElapsedMs - f.requestedTimeMs }))
    } };
  } finally {
    if (recorder.state !== 'inactive') { recorder.stop(); await complete.catch(() => {}); }
    stream.getTracks().forEach(t => t.stop());
  }
}
