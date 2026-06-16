// Jest stub for expo-file-system/legacy — only used to satisfy imports in perfLog.ts
// The buildPerf tests do not call any of these exports.
export const documentDirectory = "file:///mock/document/";
export const cacheDirectory = "file:///mock/cache/";
export const EncodingType = { Base64: "base64", UTF8: "utf8" };
export const writeAsStringAsync = async () => {};
export const readAsStringAsync = async () => "";
export const deleteAsync = async () => {};
export const getInfoAsync = async () => ({ exists: false, isDirectory: false, uri: "" });
export const makeDirectoryAsync = async () => {};
export const copyAsync = async () => {};
export const moveAsync = async () => {};
