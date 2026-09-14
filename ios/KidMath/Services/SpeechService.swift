import AVFoundation

/// Read-aloud for young readers — the iOS half of src/speech.js. The words
/// come from the shared speakableText (emoji runs become counts, operators
/// become words); the voice is the system default for the device language.
@MainActor
final class SpeechService {
    static let shared = SpeechService()
    private let synthesizer = AVSpeechSynthesizer()

    /// True when a K–1 kid is active: prompts are read automatically as they
    /// land (web: autoRead = readAloud && gradeIndex(grade) <= 1).
    static func autoReadEnabled(grade: String?) -> Bool {
        guard GamFlags.readAloud, let g = GradeSeed.gradeIndex(grade) else { return false }
        return g <= 1
    }

    @discardableResult
    func speak(_ text: String) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        utterance.pitchMultiplier = 1.05
        utterance.voice = AVSpeechSynthesisVoice(language: Locale.current.identifier)
            ?? AVSpeechSynthesisVoice(language: "en-US")
        synthesizer.speak(utterance)
        return true
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}
