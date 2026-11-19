# Privacy Policy — SnapBack

**Effective Date:** November 19, 2026

SnapBack is an open-source browser extension licensed under the MIT License. We designed SnapBack with a strict **100% Local & Zero-Telemetry** architecture.

## 1. Data Collection

**SnapBack collects zero personal data and zero browsing history.**
- No analytics, no tracking pixels, no telemetry scripts.
- No remote servers, no external API calls, no user accounts.

## 2. How Your Configuration Is Stored

All user settings—including your planned work sites (`workSites`), blocked/allowed domains (`blacklist`, `whitelist`), recurring schedules, active session timers, and daily interception counters—are stored exclusively on your own device using the browser's local storage API (`chrome.storage.local`).

This data never leaves your browser.

## 3. Permissions Justification

- **`declarativeNetRequest` & `<all_urls>`**: Required to locally redirect user-configured distraction domains to the local `src/blocked.html` reminder page before the distracting website loads.
- **`tabs`**: Required to detect whether one of the user's planned work sites is currently open (Work-Tab Auto-Trigger) and to return focus to that work tab after closing a distraction tab (Boomerang effect). Tab URLs are checked strictly in memory against the user's local domain list and are never logged or transmitted anywhere.
- **`storage`**: Required to save the user's domain lists, schedules, and daily counter locally on their device.
- **`alarms`**: Required to check schedule time windows every minute and end locked focus sessions on time.
- **`notifications`**: Required to notify the user locally when a locked focus session finishes.

## 4. Contact & Open-Source Verification

Anyone can inspect the complete source code on GitHub under the MIT License.
