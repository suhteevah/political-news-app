// Plausible custom events — privacy-friendly analytics
// See: https://plausible.io/docs/custom-event-goals

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void;
  }
}

export function trackEvent(
  event: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window !== "undefined" && window.plausible) {
    window.plausible(event, props ? { props } : undefined);
  }
}

// Pre-defined conversion events
export const events = {
  newsletterSignup: (source: string) =>
    trackEvent("Newsletter Signup", { source }),
  checkoutStarted: (plan: string) =>
    trackEvent("Checkout Started", { plan }),
  signUp: () =>
    trackEvent("Sign Up"),
  sharePost: (platform: string) =>
    trackEvent("Share Post", { platform }),
} as const;
