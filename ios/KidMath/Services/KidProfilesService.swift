import Foundation
import Supabase

/// One row in public.kid_profiles — first name, age, grade, and nothing else
/// (the §20 add-a-kid screen promises exactly that).
struct KidProfile: Identifiable, Codable, Equatable {
    let id: UUID
    let firstName: String
    let age: String
    let grade: String

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case age
        case grade
    }
}

/// Kid profiles (§20): one parent account holds up to four kids. Swift mirror
/// of src/kidProfiles.js — same table, same RLS contract, and the active kid
/// is a device-local pointer under a `kidmath-*` key (never renamed: renaming
/// silently wipes kids' local state).
@MainActor
final class KidProfilesService: ObservableObject {

    static let maxKids = 4
    static let ages = ["5", "6", "7", "8", "9", "10", "11", "12+"]
    static let grades = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"]

    private static let activeKidIdKey = "kidmath-active-kid"
    private static let activeKidNameKey = "kidmath-active-kid-name"
    private static let selectFields = "id, first_name, age, grade"

    @Published private(set) var kids: [KidProfile] = []

    private let supabase: SupabaseService

    init(supabase: SupabaseService = .shared) {
        self.supabase = supabase
    }

    // MARK: - Active kid (device-local)

    var activeKidId: String? {
        UserDefaults.standard.string(forKey: Self.activeKidIdKey)
    }

    /// Cached locally so the home greeting works offline and before refresh().
    var activeKidName: String? {
        UserDefaults.standard.string(forKey: Self.activeKidNameKey)
    }

    func setActiveKid(_ kid: KidProfile?) {
        let defaults = UserDefaults.standard
        if let kid {
            defaults.set(kid.id.uuidString, forKey: Self.activeKidIdKey)
            defaults.set(kid.firstName, forKey: Self.activeKidNameKey)
        } else {
            defaults.removeObject(forKey: Self.activeKidIdKey)
            defaults.removeObject(forKey: Self.activeKidNameKey)
        }
        objectWillChange.send()
    }

    // MARK: - Cloud rows

    func refresh() async {
        guard supabase.isSignedIn else {
            kids = []
            return
        }
        do {
            kids = try await supabase.client
                .from("kid_profiles")
                .select(Self.selectFields)
                .order("created_at", ascending: true)
                .limit(Self.maxKids)
                .execute()
                .value
        } catch {
            // Leave the last-known list; the picker degrades to what it has.
        }
    }

    @discardableResult
    func addKid(firstName: String, age: String, grade: String) async throws -> KidProfile {
        guard let userId = supabase.userId else {
            throw NSError(
                domain: "KidProfiles", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Sign in first"]
            )
        }
        struct NewKid: Encodable {
            let user_id: UUID
            let first_name: String
            let age: String
            let grade: String
        }
        let kid: KidProfile = try await supabase.client
            .from("kid_profiles")
            .insert(NewKid(
                user_id: userId,
                first_name: firstName.trimmingCharacters(in: .whitespaces),
                age: age,
                grade: grade
            ))
            .select(Self.selectFields)
            .single()
            .execute()
            .value
        kids.append(kid)
        return kid
    }
}
