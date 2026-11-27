# NANCYFLIX 8.10.0 — automatic deployment cleanup

Read **START-HERE.txt**. This repair automatically removes old API entrypoints from the temporary build copy. You can upload all ZIP contents to your existing repository root without manually deleting the old API folder. All 13 original features are retained in `lib/handlers`; only `api/index.js` is deployed.

Build command: `npm run build`. Output: `public`. Node: `24.x`. App version remains **8.10.0**, deployment revision **deployfix-2**.
