/**
 * Pick a photo. Web uses a hidden file input (works in the Arena preview).
 * Native falls back to the same pattern when document is available.
 */
export interface PickedImage {
  uri: string;
  blob: Blob;
  name: string;
  mime: string;
}

export function pickImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        uri: URL.createObjectURL(file),
        blob: file,
        name: file.name || 'document.jpg',
        mime: file.type || 'image/jpeg',
      });
    };
    input.click();
  });
}
