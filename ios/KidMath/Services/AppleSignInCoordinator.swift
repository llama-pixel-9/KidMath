import AuthenticationServices
import CryptoKit
import Foundation

/// Bridges SwiftUI's SignInWithAppleButton result to Supabase.
///
/// Apple's flow needs a nonce: we send SHA256(nonce) to Apple inside the
/// request, then hand Supabase the raw nonce with the identity token so it
/// can verify the token was minted for this sign-in.
enum AppleSignInCoordinator {

    static private(set) var currentNonce: String?

    static func configure(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = randomNonce()
        currentNonce = nonce
        request.requestedScopes = [] // Kids category: request no PII we don't need
        request.nonce = sha256(nonce)
    }

    static func complete(_ result: Result<ASAuthorization, Error>, supabase: SupabaseService) async throws {
        let authorization = try result.get()
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8),
              let nonce = currentNonce else {
            throw NSError(
                domain: "AppleSignIn", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Apple returned no identity token"]
            )
        }
        try await supabase.signInWithApple(idToken: idToken, nonce: nonce)
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }
}
