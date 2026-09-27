import { Audio } from "expo-av";

export type VoiceUiState = "idle" | "listening" | "thinking" | "speaking";

export interface RecordingResult {
  uri: string;
  mimeType: string;
}

let activeRecording: Audio.Recording | null = null;

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

  try {
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    activeRecording = recording;
  } catch (error) {
    await resetAudioModeForPlayback();
    throw error;
  }
}

export async function stopRecording(): Promise<RecordingResult | null> {
  if (!activeRecording) {
    return null;
  }

  const recording = activeRecording;
  activeRecording = null;

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    return uri ? { uri, mimeType: "audio/m4a" } : null;
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
