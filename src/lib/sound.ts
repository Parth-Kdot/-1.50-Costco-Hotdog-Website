let ctx: AudioContext | null = null
let enabled = false

export const sound = {
  get on() {
    return enabled
  },
  toggle() {
    enabled = !enabled
    if (enabled && !ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = AC ? new AC() : null
    }
    return enabled
  },
  beep(freq = 1850, ms = 70) {
    if (!enabled || !ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + ms / 1000 + 0.02)
  },
}
