#!/bin/sh
# XcodeGen can only attach a StoreKit configuration to the scheme's RUN
# action; the TEST action needs it too or StoreKitTest sessions fail with
# `notEntitled`. Run after every `xcodegen generate` (see README).
set -e
SCHEME="$(dirname "$0")/KidMath.xcodeproj/xcshareddata/xcschemes/KidMath.xcscheme"
python3 - "$SCHEME" <<'EOF'
import sys

path = sys.argv[1]
with open(path) as f:
    scheme = f.read()

REF = '''      <StoreKitConfigurationFileReference
         identifier = "../../KidMath/KidMath.storekit">
      </StoreKitConfigurationFileReference>
'''
if "</TestAction>" in scheme and scheme.count("StoreKitConfigurationFileReference") < 4:
    scheme = scheme.replace("   </TestAction>", REF + "   </TestAction>", 1)
    with open(path, "w") as f:
        f.write(scheme)
    print("scheme patched: StoreKit config added to TestAction")
else:
    print("scheme already patched")
EOF
