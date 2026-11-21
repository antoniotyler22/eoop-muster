// 4.140.0: owner password hashing and the database-counted sign-in lockout.
import test from "node:test";
import assert from "node:assert/strict";
import { hashPw, checkPw, isPw2, lockedFrom } from "../supabase/functions/owner/pw.ts";

test("salted hash: right password passes, wrong fails, two hashes of one password differ", async () => {
  const a = await hashPw("tonybeso", "correct horse battery", 100000), b = await hashPw("tonybeso", "correct horse battery", 100000);
  assert.ok(isPw2(a)); assert.notEqual(a, b);
  assert.equal(await checkPw("tonybeso", "correct horse battery", a), true);
  assert.equal(await checkPw("tonybeso", "wrong", a), false);
  assert.equal(await checkPw("someoneelse", "correct horse battery", a), false);
});
test("a malformed or old-style hash never passes", async () => {
  assert.equal(await checkPw("u", "p", "a".repeat(64)), false);
  assert.equal(await checkPw("u", "p", "pbkdf2$1$00$00"), false);
  assert.equal(isPw2("a".repeat(64)), false);
});
test("lockout: 5 tries from one address, or 25 from all addresses together", () => {
  const rows = (n, ip) => Array.from({ length: n }, () => ({ ip }));
  assert.equal(lockedFrom(rows(4, "1.1.1.1"), "1.1.1.1"), false);
  assert.equal(lockedFrom(rows(5, "1.1.1.1"), "1.1.1.1"), true);
  assert.equal(lockedFrom(rows(5, "1.1.1.1"), "2.2.2.2"), false);
  const spread = Array.from({ length: 25 }, (_, i) => ({ ip: "9.9.9." + i }));
  assert.equal(lockedFrom(spread, "8.8.8.8"), true, "rotating addresses can't dodge the lock");
});
