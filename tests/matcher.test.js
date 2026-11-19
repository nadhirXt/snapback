import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProcessName,
  isBrowserProcess,
  keywordsForDomain,
  titleMatchesDomain,
  classifyWindow
} from "../core/matcher.js";

test("normalizeProcessName strips paths and .exe on Windows and Linux", () => {
  assert.equal(normalizeProcessName("C:\\Program Files\\Mozilla Firefox\\firefox.exe"), "firefox");
  assert.equal(normalizeProcessName("/usr/lib/brave-browser/brave"), "brave");
  assert.equal(normalizeProcessName("Discord.exe"), "discord");
});

test("isBrowserProcess detects major Linux and Windows browsers", () => {
  assert.equal(isBrowserProcess("firefox.exe"), true);
  assert.equal(isBrowserProcess("brave-browser"), true);
  assert.equal(isBrowserProcess("msedge.exe"), true);
  assert.equal(isBrowserProcess("code"), false);
  assert.equal(isBrowserProcess("discord.exe"), false);
});

test("titleMatchesDomain matches real browser window titles across Firefox, Brave, Chrome, Edge", () => {
  assert.equal(titleMatchesDomain("(3) Instagram — Mozilla Firefox", "instagram.com"), true);
  assert.equal(titleMatchesDomain("Instagram - Brave", "instagram.com"), true);
  assert.equal(titleMatchesDomain("Explore / X - Google Chrome", "x.com"), true);
  assert.equal(titleMatchesDomain("Machine Learning - Coursera - Microsoft Edge", "coursera.org"), true);
});

test("classifyWindow prioritizes work apps and work sites to prevent false positives", () => {
  const state = {
    workApps: ["code", "soffice.bin"],
    workSites: ["docs.google.com", "github.com"],
    blockedApps: [{ process: "discord", label: "Discord", kill: false }],
    blacklist: ["instagram.com", "youtube.com"]
  };

  // 1. VS Code window -> work app
  assert.deepEqual(
    classifyWindow({ processName: "code.exe", title: "index.js - Visual Studio Code" }, state),
    { kind: "work", source: "app", entry: "code" }
  );

  // 2. Google Docs tab whose document title mentions "Instagram" -> safely classified as WORK, not distraction!
  assert.deepEqual(
    classifyWindow(
      { processName: "firefox", title: "Stratégie Instagram 2026 - Google Docs — Mozilla Firefox" },
      state
    ),
    { kind: "work", source: "site", entry: "docs.google.com" }
  );

  // 3. Real Instagram tab in Firefox -> distraction-site
  assert.deepEqual(
    classifyWindow({ processName: "firefox", title: "Instagram — Mozilla Firefox" }, state),
    { kind: "distraction-site", entry: "instagram.com" }
  );

  // 4. Discord desktop app -> distraction-app
  const discordRes = classifyWindow({ processName: "Discord.exe", title: "#general | Discord" }, state);
  assert.equal(discordRes.kind, "distraction-app");
  assert.equal(discordRes.entry.process, "discord");
});
