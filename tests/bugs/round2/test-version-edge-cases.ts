// Test version edge cases
// Direct inline test since import paths are tricky
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}


console.log("=== Semver Edge Cases ===");

// Bug: comparing versions with only 2 parts
console.log("compareSemver('1.0', '1.0.0'):", compareSemver("1.0", "1.0.0"));
// pa[2] = NaN, pb[2] = 0, NaN < 0 = false, NaN > 0 = false → returns 0 (accidentally correct)

// Bug: pre-release not handled
console.log("compareSemver('1.0.0-beta', '1.0.0'):", compareSemver("1.0.0-beta", "1.0.0"));
// NaN comparison since "0-beta" parsed as NaN

// Bug: caret with major=0 should constrain to same minor
console.log("checkVersionCompatibility('^0.5.0'):", checkVersionCompatibility("^0.5.0"));
// Current version is 0.5.0, major=0, so ^0.5.0 should mean >=0.5.0, <0.6.0
// Code checks curMajor === major (0===0) && compareSemver >= 0 → compatible (OK for now)

// But what about ^0.4.0 against 0.5.0? Should be compatible (same major=0, >=0.4.0)
// But semantically ^0.4.0 should mean >=0.4.0, <0.5.0 for major=0
console.log("checkVersionCompatibility('^0.4.0'):", checkVersionCompatibility("^0.4.0"));
// curMajor(0) === major(0) && 0.5.0 >= 0.4.0 → compatible 
// BUG: ^0.4.0 should NOT be compatible with 0.5.0 when major is 0

// Bug: "exact match" uses >= not ==
console.log("checkVersionCompatibility('0.4.0'):", checkVersionCompatibility("0.4.0"));
// Returns compatible because 0.5.0 >= 0.4.0, but "exact match" should require ==

// Non-numeric version parts
console.log("compareSemver('abc', '1.0.0'):", compareSemver("abc", "1.0.0"));
