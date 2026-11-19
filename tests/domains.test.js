import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDomain,
  extractHostname,
  matchesDomain,
  shouldBlockUrl,
  findMatchingWorkTab
} from "../core/domains.js";

test("normalizeDomain cleans URLs, protocols, paths, www, and wildcards", () => {
  assert.equal(normalizeDomain("https://www.instagram.com/reels/?hl=fr"), "instagram.com");
  assert.equal(normalizeDomain("  DOCS.GOOGLE.COM/document/d/123 "), "docs.google.com");
  assert.equal(normalizeDomain("*.tiktok.com"), "tiktok.com");
  assert.equal(normalizeDomain("localhost:3000/dashboard"), "localhost");
  assert.equal(normalizeDomain("invalid"), "");
  assert.equal(normalizeDomain(""), "");
});

test("extractHostname returns hostname for http/https and empty for internal schemes", () => {
  assert.equal(extractHostname("https://www.instagram.com/p/123"), "instagram.com");
  assert.equal(extractHostname("http://localhost:8080/test"), "localhost");
  assert.equal(extractHostname("chrome://extensions"), "");
  assert.equal(extractHostname("brave://settings"), "");
  assert.equal(extractHostname("chrome-extension://abcdef/src/blocked.html"), "");
});

test("matchesDomain matches exact domain and subdomains but not partial prefixes", () => {
  assert.equal(matchesDomain("instagram.com", "instagram.com"), true);
  assert.equal(matchesDomain("m.instagram.com", "instagram.com"), true);
  assert.equal(matchesDomain("sub.api.instagram.com", "instagram.com"), true);
  assert.equal(matchesDomain("myinstagram.com", "instagram.com"), false);
  assert.equal(matchesDomain("google.com", "docs.google.com"), false);
});

test("shouldBlockUrl works in blacklist and whitelist modes", () => {
  const configBlacklist = {
    mode: "blacklist",
    blacklist: ["instagram.com", "tiktok.com"],
    whitelist: ["docs.google.com"],
    workSites: ["drive.google.com"]
  };

  assert.deepEqual(shouldBlockUrl("https://www.instagram.com/explore", configBlacklist), {
    blocked: true,
    matchedDomain: "instagram.com"
  });
  assert.deepEqual(shouldBlockUrl("https://docs.google.com/document/u/0", configBlacklist), {
    blocked: false,
    matchedDomain: null
  });

  const configWhitelist = {
    mode: "whitelist",
    blacklist: ["instagram.com"],
    whitelist: ["docs.google.com"],
    workSites: ["drive.google.com"]
  };

  // Allowed because in whitelist
  assert.equal(shouldBlockUrl("https://docs.google.com/document/1", configWhitelist).blocked, false);
  // Allowed because in planned workSites
  assert.equal(shouldBlockUrl("https://drive.google.com/drive/my-drive", configWhitelist).blocked, false);
  // Blocked because neither in whitelist nor in workSites
  assert.equal(shouldBlockUrl("https://news.ycombinator.com", configWhitelist).blocked, true);
});

test("findMatchingWorkTab identifies open planned work tabs and picks best boomerang target", () => {
  const tabs = [
    { id: 10, windowId: 1, url: "https://mail.google.com", title: "Gmail", active: false, lastAccessed: 100 },
    { id: 20, windowId: 1, url: "https://docs.google.com/document/d/1", title: "Mémoire PFE - Google Docs", active: false, lastAccessed: 300 },
    { id: 30, windowId: 1, url: "https://drive.google.com/drive", title: "Mon Drive", active: false, lastAccessed: 200 }
  ];

  const workSites = ["docs.google.com", "drive.google.com"];

  // Without lastWorkTabId, picks most recently accessed (tab 20)
  const res1 = findMatchingWorkTab(tabs, workSites, null);
  assert.equal(res1.openWorkTabs.length, 2);
  assert.equal(res1.bestWorkTab?.id, 20);
  assert.equal(res1.bestWorkTab?.title, "Mémoire PFE - Google Docs");

  // With explicit lastWorkTabId = 30, picks tab 30
  const res2 = findMatchingWorkTab(tabs, workSites, 30);
  assert.equal(res2.bestWorkTab?.id, 30);
});
