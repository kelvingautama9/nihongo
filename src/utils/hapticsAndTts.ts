/**
 * Web Speech API TTS (`ja-JP`) & Web Audio / Vibration Haptic Feedback Engine
 * Follows 00_MASTER_LOGIC_SRS.md Section 4.2.5:
 * - Single word audio always sends `Kana` string (never ambiguous Kanji)
 * - Sentence audio sends `Contoh_JP` with `**` stripped
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export type HapticFeedbackType = 'LIGHT' | 'CORRECT' | 'WRONG' | 'STEP';

/**
 * Triggers smooth tactile vibration + subtle minimal audio click/tone feedback
 */
export function triggerHapticFeedback(type: HapticFeedbackType, enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined') return;

  // 1. Navigator Vibration API (for supported mobile/trackpad devices)
  if ('vibrate' in navigator) {
    try {
      if (type === 'LIGHT') navigator.vibrate(8);
      else if (type === 'STEP') navigator.vibrate(14);
      else if (type === 'CORRECT') navigator.vibrate([12, 30, 18]);
      else if (type === 'WRONG') navigator.vibrate([35, 40, 35]);
    } catch {
      // Ignore vibration errors in restricted frames
    }
  }

  // 2. Subtle Acoustic Haptic Impulse (Web Audio API sine/triangle micro-envelope)
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'LIGHT') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.025);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.start(now);
      osc.stop(now + 0.025);
    } else if (type === 'STEP') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'CORRECT') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (type === 'WRONG') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.linearRampToValueAtTime(155, now + 0.18);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * Speaks Japanese text using Web Speech API (`ja-JP`)
 */
export function speakJapaneseText(text: string, rate: number = 0.9): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    const cleanText = text.replace(/\*\*/g, '').replace(/^[～~\-]+/, '').trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.rate = Math.max(0.5, Math.min(1.5, rate));

    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find((v) => v.lang.includes('ja') || v.lang.includes('JP'));
    if (jpVoice) {
      utterance.voice = jpVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // SpeechSynthesis not available or blocked
  }
}
