// Image processing utilities

export const IMAGE_PRESETS = {
  'main-photo': { width: 1920, height: 1080, label: 'Main Photo (1920×1080)' },
  'gallery': { width: 1200, height: 800, label: 'Gallery (1200×800)' },
  'square': { width: 1000, height: 1000, label: 'Square (1000×1000)' },
  'vertical': { width: 800, height: 1200, label: 'Vertical (800×1200)' },
  'custom': { width: null, height: null, label: 'Custom Size' },
};

export const QUALITY_PRESETS = {
  'high': { quality: 0.92, label: 'High (92%)' },
  'balanced': { quality: 0.85, label: 'Balanced (85%)' },
  'optimized': { quality: 0.75, label: 'Optimized (75%)' },
};

/**
 * Convert image to WebP format with specified dimensions and quality
 */
export async function processImage(file, options = {}) {
  const {
    width,
    height,
    quality = 0.85,
    format = 'webp',
    maintainAspect = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let targetWidth = width || img.width;
      let targetHeight = height || img.height;

      if (maintainAspect && width && height) {
        const aspectRatio = img.width / img.height;
        const targetRatio = width / height;

        if (aspectRatio > targetRatio) {
          targetHeight = width / aspectRatio;
        } else {
          targetWidth = height * aspectRatio;
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mimeType = format === 'webp' ? 'image/webp' : 
                       format === 'png' ? 'image/png' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: targetWidth,
              height: targetHeight,
              size: blob.size,
              format,
            });
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Process cropped image from Cropper.js
 */
export function processCroppedImage(cropper, options = {}) {
  const {
    width,
    height,
    quality = 0.85,
    format = 'webp',
  } = options;

  const mimeType = format === 'webp' ? 'image/webp' : 
                   format === 'png' ? 'image/png' : 'image/jpeg';

  return new Promise((resolve, reject) => {
    const canvas = cropper.getCroppedCanvas({
      width,
      height,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas) {
      reject(new Error('Failed to get cropped canvas'));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            width: canvas.width,
            height: canvas.height,
            size: blob.size,
            format,
            url: URL.createObjectURL(blob),
          });
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Generate filename with pattern
 */
export function generateFilename(pattern, originalName, options = {}) {
  const { format = 'webp', width, height } = options;
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const date = new Date().toISOString().split('T')[0];
  
  let filename = pattern
    .replace('{name}', baseName)
    .replace('{date}', date)
    .replace('{width}', width || 'auto')
    .replace('{height}', height || 'auto')
    .replace('{size}', `${width}x${height}`);

  // Clean up filename
  filename = filename
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${filename}.${format}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
