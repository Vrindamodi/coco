import { Audio } from "expo-av";

import { resetRecordingProfile, startRecording, stopRecording } from "@/services/voice";

// Babel hoists the import above any const in this file, so the factory has to
// create its own mocks; the handles below are read back afterwards.
jest.mock("expo-av", () => ({
  Audio: {
    RecordingOptionsPresets: {
      HIGH_QUALITY: {
        isMeteringEnabled: true,
        android: {
          extension: ".m4a",
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
      },
    },
    Recording: { createAsync: jest.fn() },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
}));

const createAsync = Audio.Recording.createAsync as unknown as jest.Mock;
const setAudioModeAsync = Audio.setAudioModeAsync as unknown as jest.Mock;
const requestPermissions = Audio.requestPermissionsAsync as unknown as jest.Mock;

function fakeRecording() {
  return {
    getStatusAsync: jest.fn().mockResolvedValue({ durationMillis: 1200 }),
    stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
    getURI: jest.fn().mockReturnValue("file:///clip.m4a"),
  };
}

/** What `createAsync` resolves with when the recorder really is running. */
function startedRecording() {
  return { recording: fakeRecording(), status: { isRecording: true } };
}

/** The iOS sample rate the recorder was prepared with on the nth attempt. */
function sampleRateOf(call: number): number {
  return createAsync.mock.calls[call][0].ios.sampleRate;
}

beforeEach(async () => {
  // Release any recorder a previous test left prepared.
  createAsync.mockResolvedValue(startedRecording());
  await stopRecording();
  createAsync.mockReset();
  setAudioModeAsync.mockClear();
  requestPermissions.mockResolvedValue({ granted: true });
  resetRecordingProfile();
});

it("records at 16 kHz when the device accepts it", async () => {
  createAsync.mockResolvedValue(startedRecording());

  await startRecording();

  expect(createAsync).toHaveBeenCalledTimes(1);
  expect(sampleRateOf(0)).toBe(16000);
});

it("falls back when the device refuses the compact recorder", async () => {
  createAsync
    .mockRejectedValueOnce(
      new Error("Prepare encountered an error: recorder not prepared.")
    )
    .mockResolvedValue(startedRecording());

  await startRecording();

  expect(createAsync).toHaveBeenCalledTimes(2);
  expect(sampleRateOf(1)).toBe(44100);
  expect(createAsync.mock.calls[1][0].ios.numberOfChannels).toBe(1);
});

it("stops retrying a rung the device has already refused", async () => {
  createAsync
    .mockRejectedValueOnce(new Error("recorder not prepared."))
    .mockResolvedValue(startedRecording());

  await startRecording();
  await stopRecording();
  createAsync.mockClear();

  // The second tap has to open the microphone in one step: retrying the
  // refused rung tears the audio session down and back up, and the patient's
  // first word falls into the gap.
  await startRecording();

  expect(createAsync).toHaveBeenCalledTimes(1);
  expect(sampleRateOf(0)).toBe(44100);
});

it("restores playback audio and reports failure when no rung works", async () => {
  createAsync.mockRejectedValue(new Error("recorder not prepared."));

  await expect(startRecording()).rejects.toThrow("recorder not prepared.");
  expect(createAsync).toHaveBeenCalledTimes(3);
  // The session must not be left in record mode, or the reply afterwards comes
  // out of the earpiece.
  expect(setAudioModeAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({ allowsRecordingIOS: false })
  );
});

it("refuses to record without microphone permission", async () => {
  requestPermissions.mockResolvedValueOnce({ granted: false });

  await expect(startRecording()).rejects.toThrow("MIC_PERMISSION_DENIED");
  expect(createAsync).not.toHaveBeenCalled();
});

it("moves on when a recorder prepares but does not capture", async () => {
  createAsync
    .mockResolvedValueOnce({
      recording: fakeRecording(),
      status: { isRecording: false },
    })
    .mockResolvedValue(startedRecording());

  await startRecording();

  expect(createAsync).toHaveBeenCalledTimes(2);
  expect(sampleRateOf(1)).toBe(44100);
});

it("flags a recorder that died before stop was pressed", async () => {
  const recording = fakeRecording();
  // isRecording false at stop time: the session was taken away mid-clip.
  recording.getStatusAsync.mockResolvedValue({ durationMillis: 900, isRecording: false });
  createAsync.mockResolvedValue({ recording, status: { isRecording: true } });

  await startRecording();
  const result = await stopRecording();

  expect(result?.interrupted).toBe(true);
});

it("reports a healthy clip as not interrupted", async () => {
  const recording = fakeRecording();
  recording.getStatusAsync.mockResolvedValue({ durationMillis: 900, isRecording: true });
  createAsync.mockResolvedValue({ recording, status: { isRecording: true } });

  await startRecording();
  const result = await stopRecording();

  expect(result?.interrupted).toBe(false);
});
