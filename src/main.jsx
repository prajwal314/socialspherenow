import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Use the redirect URI from env at build time when available, otherwise
// fall back to the current origin + `/callback` so the app still works
// when the deployment environment variable wasn't configured.
const redirectUri =
  import.meta.env.VITE_WORKOS_REDIRECT_URI || `${window.location.origin}/callback`;

// Helpful runtime log to verify what redirect URI the built app is using
// Check the browser console after the auth redirect to confirm it matches
// the URI registered in the WorkOS dashboard.
console.log('[Auth] redirectUri ->', redirectUri);

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConvexProvider client={convex}>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={redirectUri}
      // Allow forcing devMode via Vercel env for now so tokens persist in
      // localStorage. This helps with production builds while debugging
      // session persistence. Set VITE_WORKOS_DEV_MODE=true in Vercel to
      // enable. (Not recommended for long-term production.)
      devMode={
        import.meta.env.VITE_WORKOS_DEV_MODE === 'true' ||
        window.location.hostname === 'localhost'
      }
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthKitProvider>
  </ConvexProvider>
);
