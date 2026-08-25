let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('expo-av native module not available, audio disabled:', e);
}

let ringSound: any = null;
let chimeSound: any = null;

// Pure TypeScript Base64 encoder
function toBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const l = bytes.length;
  for (let i = 0; i < l; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < l ? bytes[i + 1] : 0;
    const b3 = i + 2 < l ? bytes[i + 2] : 0;
    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = i + 1 < l ? (((b2 & 15) << 2) | (b3 >> 6)) : 64;
    const c4 = i + 2 < l ? (b3 & 63) : 64;
    result += chars[c1] + chars[c2] + (c3 === 64 ? '=' : chars[c3]) + (c4 === 64 ? '=' : chars[c4]);
  }
  return result;
}

// Writes standard 44-byte WAV header for mono PCM 16-bit
function writeWavHeader(header: Uint8Array, numSamples: number, sampleRate: number) {
  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const subChunk2Size = numSamples * 2;
  const chunkSize = 36 + subChunk2Size;

  // RIFF header
  header[0] = 0x52; // R
  header[1] = 0x49; // I
  header[2] = 0x46; // F
  header[3] = 0x46; // F
  
  header[4] = chunkSize & 0xff;
  header[5] = (chunkSize >> 8) & 0xff;
  header[6] = (chunkSize >> 16) & 0xff;
  header[7] = (chunkSize >> 24) & 0xff;

  header[8] = 0x57; // W
  header[9] = 0x41; // A
  header[10] = 0x56; // V
  header[11] = 0x45; // E

  // fmt chunk
  header[12] = 0x66; // f
  header[13] = 0x6d; // m
  header[14] = 0x74; // t
  header[15] = 0x20; // ' '
  
  header[16] = 16; // Subchunk1Size
  header[17] = 0;
  header[18] = 0;
  header[19] = 0;

  header[20] = 1; // AudioFormat = 1 (PCM)
  header[21] = 0;
  
  header[22] = 1; // NumChannels = 1
  header[23] = 0;

  header[24] = sampleRate & 0xff;
  header[25] = (sampleRate >> 8) & 0xff;
  header[26] = (sampleRate >> 16) & 0xff;
  header[27] = (sampleRate >> 24) & 0xff;

  header[28] = byteRate & 0xff;
  header[29] = (byteRate >> 8) & 0xff;
  header[30] = (byteRate >> 16) & 0xff;
  header[31] = (byteRate >> 24) & 0xff;

  header[32] = blockAlign;
  header[33] = 0;
  
  header[34] = 16; // BitsPerSample
  header[35] = 0;

  // data chunk
  header[36] = 0x64; // d
  header[37] = 0x61; // a
  header[38] = 0x74; // t
  header[39] = 0x61; // a

  header[40] = subChunk2Size & 0xff;
  header[41] = (subChunk2Size >> 8) & 0xff;
  header[42] = (subChunk2Size >> 16) & 0xff;
  header[43] = (subChunk2Size >> 24) & 0xff;
}

function combineAndToBase64(header: Uint8Array, data: Int16Array): string {
  const bytes = new Uint8Array(header.length + data.length * 2);
  bytes.set(header);
  
  const dataByteOffset = header.length;
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    bytes[dataByteOffset + i * 2] = val & 0xff;
    bytes[dataByteOffset + i * 2 + 1] = (val >> 8) & 0xff;
  }
  
  return toBase64(bytes);
}

// 1. Yeni Mesaj Bildirim Sesi (PlayNotificationSound / soft chime)
// Frekanslar: 880Hz ve hafif gecikmeli 1108.73Hz
export function generateNotificationWavBase64(): string {
  const sampleRate = 8000;
  const duration = 0.5; // 500ms
  const numSamples = sampleRate * duration;
  const header = new Uint8Array(44);
  const data = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let freq = 880;
    let amp = 0.25;
    if (t > 0.08) {
      freq = 1108.73;
    }
    const fade = Math.exp(-6 * t);
    data[i] = Math.floor(Math.sin(2 * Math.PI * freq * (t - (t > 0.08 ? 0.08 : 0))) * 32767 * amp * fade);
  }

  writeWavHeader(header, numSamples, sampleRate);
  return combineAndToBase64(header, data);
}

// 2. Arama Zil Sesi (PlayRingtoneSound / dual frequency corporate ring)
// Frekanslar: 440Hz + 480Hz
export function generateRingtoneWavBase64(): string {
  const sampleRate = 8000;
  const duration = 1.25;
  const numSamples = sampleRate * duration;
  const header = new Uint8Array(44);
  const data = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let amp = 0.15;
    if (t < 0.1) {
      amp = 0.15 * (t / 0.1);
    } else if (t > 0.9) {
      amp = 0.15 * Math.max(0, 1 - (t - 0.9) / 0.35);
    }
    const sample = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) / 2;
    data[i] = Math.floor(sample * 32767 * amp);
  }

  writeWavHeader(header, numSamples, sampleRate);
  return combineAndToBase64(header, data);
}

// Zil sesini çal
export async function startRingtone() {
  if (!Audio) return;
  try {
    if (ringSound) {
      try { await ringSound.stopAsync(); } catch (_) {}
      try { await ringSound.unloadAsync(); } catch (_) {}
      ringSound = null;
    }
    const base64 = generateRingtoneWavBase64();
    const uri = `data:audio/wav;base64,${base64}`;
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: true, volume: 0.8 }
    );
    ringSound = sound;
  } catch (e) {
    console.warn('Error starting ringtone:', e);
  }
}

// Zil sesini durdur
export async function stopRingtone() {
  if (!Audio) return;
  try {
    if (ringSound) {
      try { await ringSound.stopAsync(); } catch (_) {}
      try { await ringSound.unloadAsync(); } catch (_) {}
      ringSound = null;
    }
  } catch (e) {
    console.warn('Error stopping ringtone:', e);
  }
}

// Mesaj chime sesini çal
export async function playNotificationChime() {
  if (!Audio) return;
  try {
    if (chimeSound) {
      try { await chimeSound.stopAsync(); } catch (_) {}
      try { await chimeSound.unloadAsync(); } catch (_) {}
      chimeSound = null;
    }
    const base64 = generateNotificationWavBase64();
    const uri = `data:audio/wav;base64,${base64}`;
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: false, volume: 0.5 }
    );
    chimeSound = sound;
  } catch (e) {
    console.warn('Error playing chime:', e);
  }
}
