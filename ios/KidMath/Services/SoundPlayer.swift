import AVFoundation

/// Tone-synthesis sound effects — port of src/sounds.js. The web synthesizes
/// everything with WebAudio oscillators (no audio files); here each effect is
/// rendered once into a PCM buffer (same notes, envelopes, and waveforms) and
/// played through AVAudioEngine. Uses the .ambient session category so the
/// hardware silent switch is respected.
@MainActor
final class SoundPlayer {
    static let shared = SoundPlayer()

    private static let mutedKey = "kidmath-muted"
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let sampleRate = 44_100.0
    private var buffers: [String: AVAudioPCMBuffer] = [:]
    private var started = false

    var isMuted: Bool {
        get { UserDefaults.standard.bool(forKey: Self.mutedKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.mutedKey) }
    }

    private enum Waveform {
        case sine, triangle
    }

    private struct Note {
        let frequency: Double
        let start: Double
        let duration: Double
        var waveform: Waveform = .sine
        var volume: Double = 0.15
    }

    // The exact note sequences from sounds.js.
    private init() {
        buffers["correct"] = render([
            Note(frequency: 523.25, start: 0, duration: 0.15),
            Note(frequency: 659.25, start: 0.1, duration: 0.15),
            Note(frequency: 783.99, start: 0.2, duration: 0.2),
        ])
        buffers["streak"] = render(
            [523.25, 659.25, 783.99, 1046.5].enumerated().map { index, frequency in
                Note(frequency: frequency, start: Double(index) * 0.08, duration: 0.15, volume: 0.12)
            }
        )
        buffers["levelUp"] = render(
            [392, 440, 493.88, 523.25, 587.33, 659.25, 783.99].enumerated().map { index, frequency in
                Note(frequency: frequency, start: Double(index) * 0.06, duration: 0.12, waveform: .triangle, volume: 0.13)
            }
        )
        buffers["wrong"] = render([Note(frequency: 220, start: 0, duration: 0.25, volume: 0.08)])
        buffers["complete"] = render(
            [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].enumerated().map { index, frequency in
                Note(frequency: frequency, start: Double(index) * 0.1, duration: 0.2, volume: 0.12)
            }
        )
        // Placeholder bird chirp for the Meadow (mirror of sounds.js
        // playBirdCall) until real per-species recordings land.
        buffers["birdCall"] = render([
            Note(frequency: 1244.5, start: 0, duration: 0.09, volume: 0.1),
            Note(frequency: 1567.98, start: 0.11, duration: 0.12, volume: 0.1),
            Note(frequency: 1318.51, start: 0.26, duration: 0.1, volume: 0.08),
        ])
    }

    func playCorrect() { play("correct") }
    func playStreak() { play("streak") }
    func playLevelUp() { play("levelUp") }
    func playWrong() { play("wrong") }
    func playComplete() { play("complete") }
    func playBirdCall() { play("birdCall") }

    private func play(_ name: String) {
        guard !isMuted, let buffer = buffers[name] else { return }
        if !started {
            do {
                try AVAudioSession.sharedInstance().setCategory(.ambient)
                try AVAudioSession.sharedInstance().setActive(true)
                engine.attach(player)
                engine.connect(player, to: engine.mainMixerNode, format: buffers.values.first!.format)
                try engine.start()
                player.play()
                started = true
            } catch {
                return // no audio available (e.g. CI); stay silent
            }
        }
        player.scheduleBuffer(buffer, at: nil, options: .interrupts)
    }

    /// Mix a note sequence into one buffer, with the web's exponential-decay
    /// gain envelope per note.
    private func render(_ notes: [Note]) -> AVAudioPCMBuffer? {
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1) else { return nil }
        let totalSeconds = (notes.map { $0.start + $0.duration }.max() ?? 0) + 0.05
        let frameCount = AVAudioFrameCount(totalSeconds * sampleRate)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
        buffer.frameLength = frameCount
        let samples = buffer.floatChannelData![0]

        for note in notes {
            let startFrame = Int(note.start * sampleRate)
            let noteFrames = Int(note.duration * sampleRate)
            for frame in 0..<noteFrames where startFrame + frame < Int(frameCount) {
                let time = Double(frame) / sampleRate
                let phase = note.frequency * time * 2 * .pi
                let raw: Double = switch note.waveform {
                case .sine: sin(phase)
                case .triangle: 2 / .pi * asin(sin(phase))
                }
                // exponentialRampToValueAtTime(0.001) over the note duration.
                let envelope = note.volume * pow(0.001 / note.volume, time / note.duration)
                samples[startFrame + frame] += Float(raw * envelope)
            }
        }
        return buffer
    }
}
