// Shown at the top when the Firebase settings are missing from .env.
// The shop still loads (it needs no sign in), but signing in cannot work yet.

import { missingConfig } from "../lib/firebase.js";

export default function SetupNotice() {
  if (missingConfig.length === 0) return null;
  return (
    <div className="message message-info setup-notice" role="note">
      <span className="message-tag">Setup</span>
      <span>
        <strong>Sign in is not set up yet.</strong> Add {missingConfig.join(", ")} to your <code>.env</code> file
        (see README) and restart the dev server. You can still browse the shop.
      </span>
    </div>
  );
}
