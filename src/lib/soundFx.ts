/**
 * SiraFlow Audio Engine
 * Web Audio API & Web Speech API Synthesis for Habino Financial OS
 * 
 * Features:
 * - Robust Voice Synthesis with Persian, Arabic, Multilingual & Universal fallbacks
 * - Async voice-list resolution for Chromium/Firefox
 * - Anti-freeze heartbeat watchdog for SpeechSynthesis
 * - Harmonic Web Audio acoustic feedback for guaranteed sound in all environments
 * - Live microphone stream analyser support
 */

export class SiraFlowAudio {
  private static ctx: AudioContext | null = null;
  private static voicesLoaded: boolean = false;
  private static availableVoices: SpeechSynthesisVoice[] = [];
  private static heartbeatTimer: any = null;

  private static initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      this.availableVoices = window.speechSynthesis.getVoices() || [];
      if (this.availableVoices.length > 0) {
        this.voicesLoaded = true;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        this.availableVoices = window.speechSynthesis.getVoices() || [];
        this.voicesLoaded = true;
      };
    } catch {
      // Ignore
    }
  }

  public static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Chime when listening starts
  static playListeningChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Chime when response arrives
  static playResponseChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // Play harmonic speech cadence melody (guaranteed acoustic feedback)
  static playHarmonicSpeechFeedback() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const chords = [440, 554.37, 659.25]; // A major triad

      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.04, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  // Explicit User-Gesture Audio Unlocker for Chromium/WebKit Autoplay compliance
  static unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      // 1. Unlock Web Audio API Context
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // 2. Unlock Web Speech API (Chrome requires active user activation token)
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Micro-silent warm up utterance to register user activation
        const warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
      }

      this.initVoices();
    } catch {
      // Ignore
    }
  }

  // Text-To-Speech with resilient multi-tier fallback
  static speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    this.initVoices();
    this.playHarmonicSpeechFeedback();

    if (!window.speechSynthesis) {
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 1500);
      return;
    }

    try {
      // Ensure synthesizer is not in a paused or hung state
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      // Clean markdown, brackets and punctuation for smooth spoken Persian
      const cleanText = text
        .replace(/[*_#`[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[-+/*=]/g, ' ')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices() || this.availableVoices || [];
      
      // Tier 1: Persian voice (fa-IR, fa)
      let selectedVoice = voices.find(v => v.lang.toLowerCase().includes('fa') || v.lang.toLowerCase().includes('per'));
      
      // Tier 2: Arabic voice if Persian unavailable (phonetically closer than Latin)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().includes('ar'));
      }

      // Tier 3: Multilingual or Natural voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes('natural') || 
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('google')
        );
      }

      // Tier 4: Default voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'fa-IR';
      }

      let ended = false;
      const finish = () => {
        if (!ended) {
          ended = true;
          if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
          }
          if (onEnd) onEnd();
        }
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error, concluding speech turn:', e);
        finish();
      };

      // Heartbeat to prevent Chromium from pausing long utterances
      this.heartbeatTimer = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          finish();
        }
      }, 5000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis execution error:', err);
      if (onEnd) onEnd();
    }
  }

  static stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
