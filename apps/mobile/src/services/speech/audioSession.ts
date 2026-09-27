import { Audio } from "expo-av";

/**
 * Puts the audio session into plain playback mode.
 *
 * `playsInSilentModeIOS` is deliberate: a patient may have flicked the silent
 * switch without knowing and be unable to undo it, and losing all narration to
 * a hardware switch they cannot find is worse than the occasional unwanted
 * sound. The narration on/off setting is the intended escape hatch.
 */
export async function configurePlaybackAudioSession(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Audio routing is a nicety here; never let it block app start.
  }
}
