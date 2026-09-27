export {
  getLastNarrationDiagnostic,
  getNarrationState,
  speak,
  stopSpeaking,
  subscribeSpeaking,
  waitForSpeechRelease,
  type NarrationState,
  type SpeakOptions,
  type SpeakOutcome,
} from "./speechEngine";

export {
  getDeviceVoices,
  invalidateVoiceCatalog,
  isSpeakable,
  rankVoices,
  resolveVoice,
  subscribeVoiceCatalog,
  installVoiceCatalogLifecycle,
  type MatchTier,
  type ResolvedVoice,
} from "./voiceCatalog";

export {
  announce,
  initScreenReaderWatch,
  isScreenReaderOn,
  subscribeScreenReader,
} from "./screenReader";

export { configurePlaybackAudioSession } from "./audioSession";

export {
  detectScript,
  isScriptCompatible,
  scriptForLanguage,
  segmentByScript,
  type ScriptId,
} from "./scriptDetect";

export { joinForSpeech, normalizeForSpeech } from "./textNormalizer";
export {
  bridgeAssameseForBengaliVoice,
  bridgeForVoice,
  needsAssameseToBengaliBridge,
} from "./scriptBridge";
export { buildLadder, type Attempt } from "./ladder";
export { daypartForHour, numberToWords, timeToWords } from "./numberFormats";
export { chunkForSpeech, getMaxChunkLength } from "./chunk";
