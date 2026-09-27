import { AccessibilityInfo, Platform } from "react-native";

let screenReaderOn = false;
let started = false;
let resolveReady: () => void = () => {};

/**
 * Resolves once the first `isScreenReaderEnabled()` answer is in. The check is
 * async and settles after first paint, so without awaiting it the splash screen
 * would narrate over VoiceOver every launch.
 */
export const readyPromise: Promise<void> = new Promise((resolve) => {
  resolveReady = resolve;
});

const listeners = new Set<(on: boolean) => void>();

function publish(on: boolean): void {
  if (on === screenReaderOn) return;
  screenReaderOn = on;
  listeners.forEach((listener) => listener(on));
}

export function isScreenReaderOn(): boolean {
  return screenReaderOn;
}

export function subscribeScreenReader(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Idempotent — safe to call from App.tsx on every mount. */
export function initScreenReaderWatch(): () => void {
  if (started) return () => {};
  started = true;

  AccessibilityInfo.isScreenReaderEnabled()
    .then((enabled) => publish(enabled))
    .catch(() => publish(false))
    .finally(() => resolveReady());

  // RN 0.81 returns an EmitterSubscription; removeEventListener no longer exists.
  const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", publish);

  return () => {
    subscription.remove();
    started = false;
  };
}

/**
 * Hands a message to the screen reader instead of speaking it ourselves.
 *
 * On iOS a plain announcement made during a screen transition is dropped, so it
 * has to be queued.
 */
export function announce(text: string): void {
  const message = text.trim();
  if (!message) return;

  if (Platform.OS === "ios") {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
    return;
  }
  AccessibilityInfo.announceForAccessibility(message);
}
