# Chrome Web Store submission — Work Tracker 1.1.0

Publication is optional and currently deferred: the owner chose to avoid the registration fee. No payment or submission was made. Use the free unpacked setup below.

## Free setup currently selected

1. Run `npm run build:work-tracker-extension`.
2. In `chrome://extensions`, enable Developer mode, choose Load unpacked, and select `extensions/work-tracker/dist`.
3. Copy the installed extension's ID. In ERP Work Tracker → Connections, enter that ID and a recognizable browser name, then select Connect this browser.
4. Enable automatic tracking in the extension popup. No token copying is needed.

Repeat for each Chrome profile. Keep the unpacked folder in place. After extension updates rebuild and use Reload in Chrome. Reload the ERP page if Chrome's website messaging API is unavailable immediately after installation. Leave `NEXT_PUBLIC_WORK_TRACKER_EXTENSION_ID` unset for this setup.

Recommended visibility: Unlisted. Anyone with the link can install; ERP authentication and a personal credential are still required.

## Build and upload

Run `npm run build:work-tracker-extension`, then package the contents of `extensions/work-tracker/dist` as a ZIP with manifest.json at its root. No ERP source, environment files or credentials belong in this ZIP.

Open https://chrome.google.com/webstore/devconsole and complete Google sign-in and developer registration if needed. Any registration fee and account agreements must be completed by the account owner.

Upload the ZIP as a new item. Google assigns an extension ID at this stage, before approval. Set `NEXT_PUBLIC_WORK_TRACKER_EXTENSION_ID` to that ID in the ERP deployment and rebuild the ERP. The Connections tab then displays the store install link and connects to that ID. Before publication, the UI accepts an unpacked extension ID for testing.

Supply the listing screenshots, privacy policy URL, support contact and reviewer instructions. Submit for review; availability depends on Google's decision. Test actual installation and connection in a separate Chrome profile after approval.

## Listing draft

Name: KhyatiGems Work Tracker

Summary: Opt-in active-tab work estimates for KhyatiGems ERP and supported marketplaces.

Description: Connect your Chrome profile to your KhyatiGems ERP account with a recognizable browser name. Enable automatic tracking to estimate active work on supported eBay, Etsy and Amazon pages. Idle, locked and unfocused time is excluded. Pause at any time, inspect synchronization status and revoke a browser's credential in ERP. Requires an authorized KhyatiGems ERP account. Observations estimate work time and do not prove a listing was published.

Single purpose: Record opt-in estimates of active marketplace work time for the user's ERP work report.

## Permission explanations

- tabs: Read the active tab URL locally to classify exact supported marketplace domains. Full URLs and page titles are not uploaded.
- idle: Exclude inactivity and locked sessions.
- storage: Keep this profile's personal credential, settings and offline event queue locally, outside Chrome sync.
- alarms: Sample activity and retry pending uploads while Chrome runs.
- ERP host access: Send activity events and verify the personal credential against the configured ERP.
- Optional HTTPS and loopback host access: Allow users to explicitly configure another ERP deployment or local testing environment through Settings. No content scripts or remote executable code are used.
- externally_connectable: Permit only the production ERP and loopback development pages to initiate named browser pairing. Sender origin is checked again by the worker.

## Privacy disclosures to review in the dashboard

Declare browsing activity/website usage because supported marketplace domains and activity timestamps are collected. Declare authentication information because a personal ERP credential is stored. Review Google's current category definitions for the final selections. Do not claim that no user data is collected.

Publish the privacy notice at `/work-tracker-extension-privacy` with the ERP update, confirm public access, and use its full production URL in the dashboard. It explains local classification, uploaded fields, retention, control and account association. Reviewer access requires a dedicated test ERP account supplied by the owner through the dashboard's private test instructions; do not put live passwords in this repository.

## Acceptance checks

Install into a clean Chrome profile; sign into ERP; enter a browser name; connect without copying a credential; confirm the named credential appears in ERP. Enable tracking in the popup, test active/idle/lock/focus behavior and successful upload, then revoke access and confirm rejection. Test a second profile with a different name. Existing profiles must not be silently overwritten; pending records must never move between accounts.
