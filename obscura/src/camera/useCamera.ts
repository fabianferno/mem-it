import { useCallback, useRef } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);

  const capture = useCallback(async (): Promise<string | undefined> => {
    const photo = await ref.current?.takePictureAsync({ quality: 0.9, skipProcessing: false });
    return photo?.uri;
  }, []);

  return { permission, requestPermission, ref, capture };
}
