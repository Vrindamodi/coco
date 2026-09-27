import { Audio } from "expo-av";

export type VoiceUiState = "idle" | "listening" | "thinking" | "speaking";

export interface RecordingResult {
  uri: string;
  mimeType: string;
  durationMillis: number;
  /**
   * The recorder had already stopped before we asked it to. The audio session
   * was taken away underneath it, so the clip is silence from that point on
   * and not worth an upload.
   */
  interrupted: boolean;
}

/** Anything shorter is an accidental tap; Whisper hallucinates text for it. */
export const MIN_RECORDING_MS = 700;
/** Cap so a forgotten open mic does not upload an unbounded file. */
export const MAX_RECORDING_MS = 60_000;

/**
 * Whisper resamples everything to 16 kHz mono before decoding, so the stock
 * 44.1 kHz stereo preset only makes the upload larger on weak rural networks.
 */
const SPEECH_RECORDING_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  android: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
};

/**
 * The device's own sample rate, still mono. Half the upload of the stock
 * preset, and it prepares on hardware that refuses a resampled recorder.
 */
const MONO_RECORDING_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  android: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
    numberOfChannels: 1,
    bitRate: 64000,
  },
};

interface RecordingRung {
  label: string;
  options: Audio.RecordingOptions;
}

/**
 * Recorder settings from the smallest upload to the most compatible.
 *
 * Some devices refuse to prepare a recorder that is not at their native rate —
 * iOS answers "Prepare encountered an error: recorder not prepared." — and the
 * refusal is a property of the hardware, not of the moment. Retrying the whole
 * ladder on every tap would promote and tear down the audio session twice
 * before the microphone opens, which swallows the first word the patient says,
 * so the rung that worked is remembered for the rest of the session.
 */
const RECORDING_LADDER: readonly RecordingRung[] = [
  { label: "16 kHz mono", options: SPEECH_RECORDING_OPTIONS },
  { label: "device rate, mono", options: MONO_RECORDING_OPTIONS },
  { label: "device default", options: Audio.RecordingOptionsPresets.HIGH_QUALITY },
];

let activeRecording: Audio.Recording | null = null;
let workingRung = 0;

/** Forget which rung worked. Tests only; a real device does not change mid-run. */
export function resetRecordingProfile(): void {
  workingRung = 0;
}

export async function requestMicPermission(): Promise<boolean> {
  const permission = await Audio.requestPermissionsAsync();
  return permission.granted;
}

/**
 * Returns the session to plain playback.
 *
 * Leaving iOS in `PlayAndRecord` routes output to the earpiece rather than the
 * speaker, which makes the assistant's spoken reply almost inaudible right
 * after the patient finishes talking.
 */
export async function resetAudioModeForPlayback(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  } catch {
    // The session is best-effort; never let it break the recording flow.
  }
}

export async function startRecording(): Promise<void> {
  const granted = await requestMicPermission();
  if (!granted) {
    throw new Error("MIC_PERMISSION_DENIED");
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  // expo-av allows one prepared Recording at a time. A clip left behind by a
  // failed stop, a Fast Refresh or a crashed request would otherwise make
  // every later tap fail with "Only one Recording object can be prepared".
  await discardStaleRecording();

  let lastError: unknown;
  for (let rung = workingRung; rung < RECORDING_LADDER.length; rung += 1) {
    try {
      activeRecording = await createRecording(RECORDING_LADDER[rung].options);
      if (rung !== workingRung) {
        console.warn(
          `Recording at ${RECORDING_LADDER[workingRung].label} was refused; ` +
            `using ${RECORDING_LADDER[rung].label} from now on`,
          lastError
        );
        workingRung = rung;
      }
      return;
    } catch (error) {
      lastError = error;
    }
  }

  // Every rung failed: the microphone is unusable, not merely fussy.
  await resetAudioModeForPlayback();
  throw lastError;
}

async function createRecording(
  options: Audio.RecordingOptions
): Promise<Audio.Recording> {
  const { recording, status } = await Audio.Recording.createAsync(options);
  // A recorder that prepares but does not run captures silence, which reaches
  // the patient as "I did not understand that" a sentence later. Treat it as a
  // refusal so the next rung gets a turn.
  if (status && status.isRecording === false) {
    await recording.stopAndUnloadAsync().catch(() => undefined);
    throw new Error("Recorder prepared but is not capturing audio");
  }
  return recording;
}

async function discardStaleRecording(): Promise<void> {
  const stale = activeRecording;
  activeRecording = null;
  if (!stale) {
    return;
  }
  try {
    await stale.stopAndUnloadAsync();
  } catch {
    // Already unloaded, or never finished preparing; nothing to release.
  }
}

export async function stopRecording(): Promise<RecordingResult | null> {
  if (!activeRecording) {
    return null;
  }

  const recording = activeRecording;
  activeRecording = null;

  try {
    let durationMillis = 0;
    let interrupted = false;
    try {
      const status = await recording.getStatusAsync();
      durationMillis = status.durationMillis ?? 0;
      interrupted = status.isRecording === false;
    } catch {
      // Unknown duration must not block the upload; the server still guards.
    }
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    return uri ? { uri, mimeType: "audio/m4a", durationMillis, interrupted } : null;
  } finally {
    // In a finally block so a failed unload cannot strand the session in
    // record mode and silence every later utterance.
    await resetAudioModeForPlayback();
  }
}

export function getVoiceStateLabel(
  state: VoiceUiState,
  t: (path: string) => string
): string {
  switch (state) {
    case "listening":
      return t("voice.listening");
    case "thinking":
      return t("voice.thinking");
    case "speaking":
      return t("voice.speaking");
    default:
      return t("voice.idle");
  }
}
