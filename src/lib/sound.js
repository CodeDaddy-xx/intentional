// src/lib/sound.js
// Generates notification tones via Web Audio API — no audio files needed

/**
 * Play the pulse alert sound.
 * A three-note ascending chime — attention-grabbing but not jarring.
 */
export function playPulseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    const notes = [
      { freq: 440, start: 0,    duration: 0.15 },  // A4
      { freq: 554, start: 0.18, duration: 0.15 },  // C#5
      { freq: 659, start: 0.36, duration: 0.3  },  // E5
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)

      // Fade in + fade out for each note
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.04)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration + 0.05)
    })

    // Close context after sound finishes
    setTimeout(() => ctx.close(), 1500)
  } catch (e) {
    // Silently fail if audio not available
  }
}

/**
 * Play a gentle confirmation sound when user says "No, I'm fine"
 */
export function playDismissSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(392, ctx.currentTime)       // G4
    osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.2) // E4

    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    setTimeout(() => ctx.close(), 500)
  } catch (e) {}
}
