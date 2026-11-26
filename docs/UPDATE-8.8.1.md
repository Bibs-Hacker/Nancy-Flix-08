# Apply the NANCYFLIX v8.8.1 fix

## Why your Google button was missing

The public domain was still serving **v8.7.2** when checked on 26 November 2026. That older app contains no Google sign-in button and uses the old backend. Setting up Firebase does not update the website files automatically.

## Update in this order

1. Download and extract `nancyflix-v8.8.1.zip`. Open the extracted `nancyflix-v8.8.1` folder.
2. Upload the files INSIDE it to your existing GitHub repository root. `index.html`, `package.json`, `vercel.json`, `sw.js`, `version.json`, `api/` and `lib/` must be at the root, not inside another `build` or version folder. Upload all folders together; do not update only index.html. Include `.gitignore` if using Git.
3. Remove obsolete `api/share-image.js`, `api/share-card.js`, and `api/lib/` if they are still in your repository. There should be 11 JavaScript function files directly inside `api/`, within the 12-function Hobby limit.
4. Vercel → your project → Deployments. Wait for the new deployment to say **Ready**. Open that deployment first. If it shows v8.8.1 but your normal domain does not, use the deployment's menu to **Promote to Production**, or check which project owns your domain.
5. Visit your normal domain. The sign-in card must say **v8.8.1 · Firebase sign-in**, with **Continue with Google** above Email. If it still says v8.7.2, the new deployment is not assigned to the domain or your installed app has an older shell. Close and reopen it, then test in an incognito/private browser. Do NOT delete your saved browser data just to refresh it.
6. Firebase → Authentication → Sign-in method → Google: enabled. Authentication → Settings → Authorized domains: add `nancy-flix-08.vercel.app`. Firebase does not create the Google button in your app; the new app files do.
7. If your Firestore rules are already published, replace them with the `firestore.rules` included in this release, then Publish. It tightens role fields and ownership checks. Storage rules are optional for this update; do not enable billing just to play trailers or cartoons.

Keep your existing private TMDB key in Vercel (`TMDB_V3_KEY` or `TMDB_API_KEY`). There is no new paid trailer API. Keep the existing server Supabase keys until the remaining server features are migrated. Never upload `.env`, a Firebase service-account JSON or a private key to GitHub.

## Phone checks after deployment

- Log out or open a private tab: Continue with Google is visible, and the version is 8.8.1.
- Browse as guest remains available.
- Open **Accidental Partners** → Play trailer. The live TMDB videos endpoint returned one video for this film; it is now retrieved instead of the empty state shown in your screenshot.
- Open **Inception** → Play trailer. Multiple linked videos were available at test time. The selector lets you try another clip.
- If YouTube refuses embedded playback, tap **Watch on YouTube**. Region, deleted-video and age restrictions cannot be bypassed by this app.
- Open **Kids**: the official cartoon library appears first, with Tom & Jerry Gokko, The Tom and Jerry Show, Bluey and Gumball. Live channels remain further down.
- Video/collection cards open the official embedded player. Cards labelled **Open official channel** open the publisher's YouTube page, including current Peppa Pig uploads. They are not silently presented as playable episodes.

## Honest limits

Official free clips, episode compilations and publisher-selected full episodes are included through YouTube embeds and links. This is not a licensed full-season catalogue. Some publishers disable embedding or limit videos by country. Actual playback and real Firebase account sign-in still need a phone test after deployment; the isolated browser tests did not bypass these restrictions or modify your accounts.
