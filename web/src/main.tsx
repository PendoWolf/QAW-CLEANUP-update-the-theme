import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

let visitorId = localStorage.getItem('demo-visitor-id');
let accountId = localStorage.getItem('demo-account-id');

if (!visitorId) {
  visitorId = 'visitor-' + Math.random().toString(36).slice(2);
  localStorage.setItem('demo-visitor-id', visitorId);
}
if (!accountId) {
  accountId = 'account-' + Math.random().toString(36).slice(2);
  localStorage.setItem('demo-account-id', accountId);
}

pendo.initialize({
  visitor: {
    id: visitorId,
  },
  account: {
    id: accountId,
  },
  sessionReplay: { isActive: true },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
