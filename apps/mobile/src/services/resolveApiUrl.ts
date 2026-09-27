const DEFAULT_PORT = 8000;
const DEFAULT_API_URL = `http://localhost:${DEFAULT_PORT}`;
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.trim().toLowerCase());
}

/**
 * Expo tunnel / ngrok hosts serve the JS bundle, not the FastAPI backend.
 * Using them as the API host would send logins to the wrong machine.
 */
export function isBundlerOnlyHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host.endsWith(".exp.direct") ||
    host.endsWith(".expo.dev") ||
    host.endsWith(".ngrok.io") ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok.app")
  );
}

export function isUsableLanHost(hostname: string): boolean {
  const host = hostname.trim();
  if (!host) return false;
  if (isLoopbackHostname(host) || isBundlerOnlyHost(host)) return false;
  return true;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function withHostname(url: URL, hostname: string): string {
  const next = new URL(url.toString());
  next.hostname = hostname;
  return next.origin;
}

export function resolveApiUrl(options: {
  envUrl?: string | null;
  platform: string;
  packagerHost?: string | null;
}): string {
  const envUrl = options.envUrl?.trim().replace(/\/$/, "") ?? "";
  const envParsed = envUrl ? parseUrl(envUrl) : null;
  const envIsLoopback = !envParsed || isLoopbackHostname(envParsed.hostname);

  if (envParsed && !envIsLoopback) {
    return envParsed.origin;
  }

  const packagerHost = options.packagerHost?.trim() ?? "";
  const targetHost = isUsableLanHost(packagerHost)
    ? packagerHost
    : options.platform === "android"
      ? ANDROID_EMULATOR_HOST
      : null;

  if (targetHost) {
    if (envParsed) {
      return withHostname(envParsed, targetHost);
    }
    return `http://${targetHost}:${DEFAULT_PORT}`;
  }

  return envUrl || DEFAULT_API_URL;
}
