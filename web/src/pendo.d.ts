// Minimal type for the Pendo agent that Novus installs at runtime.
// The real implementation is loaded by the Pendo snippet; here we only
// declare the surface our app touches so trackEvent() is type-safe.
export {};

declare global {
  interface PendoAgent {
    track?: (name: string, props?: Record<string, unknown>) => void;
    initialize?: (config: Record<string, unknown>) => void;
    identify?: (config: Record<string, unknown>) => void;
    clearSession?: () => void;
  }
  interface Window {
    pendo?: PendoAgent;
  }
  var pendo: any;
}
