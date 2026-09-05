import { Platform } from "react-native";

export interface PickedImage {
  uri: string;
  blob: Blob;
  name: string;
  mime: string;
}

/** Uses the browser file picker in the web preview and Expo's native picker on
 * iOS/Android, so KYC and proof-of-delivery uploads work in both targets. */
export async function pickImage(): Promise<PickedImage | null> {
  if (Platform.OS !== "web") {
    const ImagePicker = await import("expo-image-picker");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    return {
      uri: asset.uri,
      blob: await response.blob(),
      name: asset.fileName || `aurasure-${Date.now()}.jpg`,
      mime: asset.mimeType || "image/jpeg",
    };
  }
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        uri: URL.createObjectURL(file),
        blob: file,
        name: file.name || "document.jpg",
        mime: file.type || "image/jpeg",
      });
    };
    input.click();
  });
}
