/**
 * Compress an image file client-side using canvas.
 * Resizes to maxDimension (longest side) and compresses to target quality.
 * This dramatically reduces the payload to Gemini API (e.g., 8MB → 200KB).
 */
export function compressImage(
    file: File,
    maxDimension: number = 1024,
    quality: number = 0.8
): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            // Calculate new dimensions maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            // Draw to canvas at reduced size
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG for best compression (even if source was PNG)
            const base64 = canvas.toDataURL('image/jpeg', quality);
            resolve({ base64, mimeType: 'image/jpeg' });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
