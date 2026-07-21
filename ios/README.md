# KidMath iOS

Native SwiftUI app for iPhone + iPad. The math engine is NOT rewritten in
Swift — the exact JS engine from `../src/` runs inside JavaScriptCore via
`EngineBridge` (see `docs`-level plan: one shared brain, changes made once).

## Layout

```
project.yml            XcodeGen spec — the .xcodeproj is generated, not committed
KidMath/
  App/                 @main + root view
  Engine/              EngineBridge.swift — the JSContext seam to the JS engine
  Resources/           KidMathEngine.bundle.js (build artifact, gitignored)
KidMathTests/
  EngineBridgeTests.swift   engine-through-JSC tests incl. Node parity
  Fixtures/            parity fixtures generated from Node (committed)
```

## Building

```sh
# 1. Build the engine bundle from the shared JS source (repo root)
npm run build:engine

# 2. Generate the Xcode project (brew install xcodegen), then patch the
#    scheme (adds the StoreKit test configuration to the test action,
#    which XcodeGen cannot express)
cd ios && xcodegen generate && ./patch-scheme.sh

# 3. Open ios/KidMath.xcodeproj in Xcode, or run tests headless:
xcodebuild test -project KidMath.xcodeproj -scheme KidMath \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

After any engine change in `src/`: `npm run build:engine && npm run test:engine`,
then regenerate parity fixtures if generation output legitimately changed:
`node scripts/generateParityFixtures.mjs`.

## Engine contract

Everything crosses the Swift↔JS boundary as JSON (see `src/engine/nativeEntry.js`):

- Swift fetches approved bank items from Supabase → `setBankItems(items)`
- Swift owns saved progress → passed as `options.savedProgress` to `createSession`
- The engine is synchronous and never touches the network or persists anything
