# Task 0 spike — device verification checklist (OPEN)

The logic core is built and unit-tested (26 passing tests, no device). These
items need a real iPhone 14 Pro (QVAC + mic + WebGL) and could not be verified
in CI/headless. Work through them on-device and record findings here.

## 1. Install + build
- [ ] `npm install` then `npx expo install expo-audio expo-sqlite react-native-webview`
      (correct the placeholder versions in package.json to whatever Expo pins for SDK 56).
- [ ] `npm run ios` builds and boots on device.

## 2. Audio format (the one timeline risk)
- [ ] Confirm `expo-audio` produces a file `transcribe()` can read. Verify the
      exact module API against https://docs.expo.dev/versions/v56.0.0/ —
      `useAudioRecorder`, `RecordingOptions`, `IOSOutputFormat` names in
      `src/audio/recordingOptions.ts` may need adjusting.
- [ ] If Whisper rejects the file, establish the conversion (the worker bundles
      `bare-ffmpeg`) and note it here.
- Findings: _______

## 3. Pipeline end to end
- [ ] Record ~30s → Whisper transcript returns.
- [ ] Llama streams extraction JSON; nodes appear in the live graph (RecordScreen).
- [ ] Summary + action items saved; visible in Meeting detail.
- [ ] Embeddings persist; nodes merge across a second related meeting.

## 4. 3D graph (WebGL — unverifiable headless)
- [ ] `GraphWebView` renders glowing nodes; tap fires `onNodeTap`.
- [ ] Tune bloom/glow + force params (Task 11 polish). The UMD exposes
      `Graph.postProcessingComposer()`; add an UnrealBloomPass on-device if the
      built-in bright nodes don't read as "glowing" enough.

## 5. RAG
- [ ] Ask a question → relevant answer with citations from past meetings.

## 6. Memory
- [ ] Full pipeline stays under the jetsam limit (sequential load/unload). Watch
      Xcode memory gauge; confirm no two models resident at once.
