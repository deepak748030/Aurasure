import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
export interface PickedImage { uri: string; blob: Blob | { uri: string; name: string; type: string }; name: string; mime: string; }
export async function pickImage(): Promise<PickedImage | null> {
  if (Platform.OS !== 'web') {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return null;
    const name = asset.fileName || `aurasure-${Date.now()}.jpg`;
    const mime = asset.mimeType || 'image/jpeg';
    return { uri: asset.uri, blob: { uri: asset.uri, name, type: mime }, name, mime };
  }
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => { const file = input.files?.[0]; if (!file) return resolve(null); resolve({ uri: URL.createObjectURL(file), blob: file, name: file.name || 'image.jpg', mime: file.type || 'image/jpeg' }); };
    input.click();
  });
}
