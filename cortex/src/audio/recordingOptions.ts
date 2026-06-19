import { IOSOutputFormat, RecordingOptions } from "expo-audio";

// Whisper wants 16 kHz mono PCM. Recording straight to WAV/PCM avoids a
// transcode step before transcribe(). VERIFY on device against the Expo v56
// audio docs (Task 0 spike) — exact enum names/fields may need adjusting.
export const WAV_16K_MONO: RecordingOptions = {
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  android: {
    outputFormat: "default",
    audioEncoder: "default",
  },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: 96, // AudioQuality.HIGH
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};
