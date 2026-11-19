import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES, resolveLanguage, t } from "../core/i18n.js";
import { getActivationStatus } from "../core/state.js";

test("resolveLanguage handles explicit fr/en and auto browser locale fallback", () => {
  assert.equal(resolveLanguage("fr", "en-US"), "fr");
  assert.equal(resolveLanguage("en", "fr-FR"), "en");
  assert.equal(resolveLanguage("auto", "en-GB"), "en");
  assert.equal(resolveLanguage("auto", "fr-CA"), "fr");
  assert.equal(resolveLanguage(undefined, "es-ES"), "fr");
});

test("FR and EN dictionaries have identical keys", () => {
  const frKeys = Object.keys(MESSAGES.fr).sort();
  const enKeys = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(frKeys, enKeys);
});

test("t interpolates parameters in both French and English", () => {
  assert.equal(
    t("status_auto", "fr", { domain: "docs.google.com" }),
    "Auto-Focus actif (docs.google.com)"
  );
  assert.equal(
    t("status_auto", "en", { domain: "docs.google.com" }),
    "Auto-Focus active (docs.google.com)"
  );
  assert.equal(
    t("blk_btn_return_to", "en", { title: "Thesis Doc" }),
    "Return to Thesis Doc"
  );
});

test("getActivationStatus localizes status labels according to lang parameter", () => {
  const state = {
    autoTriggerEnabled: true,
    manualOn: false,
    sessionEndsAt: null,
    schedules: []
  };
  const openWorkTabs = [{ id: 1, domain: "github.com", title: "Repo" }];

  const frStatus = getActivationStatus(state, new Date("2026-11-19T12:00:00"), openWorkTabs, "fr");
  const enStatus = getActivationStatus(state, new Date("2026-11-19T12:00:00"), openWorkTabs, "en");

  assert.equal(frStatus.label, "Auto-Focus actif (github.com)");
  assert.equal(enStatus.label, "Auto-Focus active (github.com)");
});
