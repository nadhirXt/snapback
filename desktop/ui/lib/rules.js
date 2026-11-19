/**
 * Pure declarativeNetRequest rule builder for FocusGuard.
 * Generates dynamic rules for both Blacklist and Whitelist modes.
 */

import { normalizeDomain } from "./domains.js";

/**
 * Deduplicates and normalizes a list of domain strings.
 *
 * @param {string[]} domains
 * @returns {string[]}
 */
export function cleanDomainList(domains = []) {
  if (!Array.isArray(domains)) return [];
  const seen = new Set();
  for (const item of domains) {
    const norm = normalizeDomain(item);
    if (norm) seen.add(norm);
  }
  return Array.from(seen);
}

/**
 * Builds Chrome declarativeNetRequest rules when blocking is active.
 *
 * - Blacklist mode:
 *   Creates 1 redirect rule per blocked domain (priority 1).
 *   Redirects main_frame requests to `chrome-extension://<extensionId>/src/blocked.html#<originalUrl>`
 *
 * - Whitelist mode:
 *   Rule #1 (priority 1): Redirects all http/https main_frame requests to `blocked.html#<originalUrl>`.
 *   Rules #2..N (priority 2): `allow` rules for each domain in `whitelist` + `workSites`.
 *
 * @param {{
 *   active: boolean,
 *   mode: "blacklist" | "whitelist",
 *   blacklist: string[],
 *   whitelist: string[],
 *   workSites?: string[],
 *   extensionId: string
 * }} params
 * @returns {Array<object>}
 */
export function buildRules({
  active = true,
  mode = "blacklist",
  blacklist = [],
  whitelist = [],
  workSites = [],
  extensionId
} = {}) {
  if (!active || !extensionId) {
    return [];
  }

  const redirectTarget = `chrome-extension://${extensionId}/src/blocked.html#\\0`;

  if (mode === "whitelist") {
    const allowedDomains = cleanDomainList([...whitelist, ...workSites]);
    const rules = [
      {
        id: 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            regexSubstitution: redirectTarget
          }
        },
        condition: {
          regexFilter: "^https?://.*$",
          resourceTypes: ["main_frame"]
        }
      }
    ];

    allowedDomains.forEach((domain, index) => {
      rules.push({
        id: index + 2,
        priority: 2,
        action: {
          type: "allow"
        },
        condition: {
          requestDomains: [domain],
          resourceTypes: ["main_frame"]
        }
      });
    });

    return rules;
  }

  // Blacklist mode
  const blockedDomains = cleanDomainList(blacklist);
  return blockedDomains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: redirectTarget
      }
    },
    condition: {
      regexFilter: "^https?://.*$",
      requestDomains: [domain],
      resourceTypes: ["main_frame"]
    }
  }));
}
