import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Redirect URI points to our API callback endpoint
// This handles the OAuth code exchange server-side
const redirectUri = `${window.location.origin}/api/auth/callback`;

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConvexProvider client={convex}>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={redirectUri}
      // devMode only for localhost development
      devMode={window.location.hostname === 'localhost'}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthKitProvider>
  </ConvexProvider>
);
