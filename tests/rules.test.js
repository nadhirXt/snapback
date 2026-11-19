import test from "node:test";
import assert from "node:assert/strict";
import { buildRules } from "../core/rules.js";

test("buildRules returns empty array when inactive", () => {
  const rules = buildRules({
    active: false,
    mode: "blacklist",
    blacklist: ["instagram.com"],
    extensionId: "ext123"
  });
  assert.deepEqual(rules, []);
});

test("buildRules generates redirect rules per domain in blacklist mode", () => {
  const rules = buildRules({
    active: true,
    mode: "blacklist",
    blacklist: ["https://www.instagram.com", "tiktok.com", "instagram.com"],
    extensionId: "ext123"
  });

  // Deduplicated to 2 rules
  assert.equal(rules.length, 2);
  assert.equal(rules[0].action.type, "redirect");
  assert.equal(
    rules[0].action.redirect.regexSubstitution,
    "chrome-extension://ext123/src/blocked.html#\\0"
  );
  assert.deepEqual(rules[0].condition.requestDomains, ["instagram.com"]);
  assert.deepEqual(rules[1].condition.requestDomains, ["tiktok.com"]);
});

test("buildRules generates global redirect + allow rules for whitelist and workSites in whitelist mode", () => {
  const rules = buildRules({
    active: true,
    mode: "whitelist",
    whitelist: ["docs.google.com"],
    workSites: ["drive.google.com"],
    extensionId: "ext123"
  });

  // 1 catch-all redirect + 2 allow rules
  assert.equal(rules.length, 3);
  assert.equal(rules[0].action.type, "redirect");
  assert.equal(rules[0].priority, 1);

  assert.equal(rules[1].action.type, "allow");
  assert.equal(rules[1].priority, 2);
  assert.deepEqual(rules[1].condition.requestDomains, ["docs.google.com"]);

  assert.equal(rules[2].action.type, "allow");
  assert.equal(rules[2].priority, 2);
  assert.deepEqual(rules[2].condition.requestDomains, ["drive.google.com"]);
});
