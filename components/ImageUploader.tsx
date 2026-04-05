'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (base64: string, mimeType: string) => void;
  isLoading?: boolean;
  maxSizeMB?: number;
}

export default function ImageUploader({
  onImageSelect,
  isLoading = false,
  maxSizeMB = 2,
}: ImageUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const compressImage = useCallback(
    async (file: File): Promise<{ base64: string; mimeType: string }> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Max dimensions
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1920;

            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Start with high quality, reduce if needed
            let quality = 0.9;
            let base64 = canvas.toDataURL('image/jpeg', quality);

            // Reduce quality until under max size
            while (base64.length > maxSizeBytes * 1.37 && quality > 0.1) {
              // 1.37 accounts for base64 overhead
              quality -= 0.1;
              base64 = canvas.toDataURL('image/jpeg', quality);
            }

            resolve({
              base64: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
              mimeType: 'image/jpeg',
            });
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    [maxSizeBytes]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload an image file (PNG, JPG, GIF, or WebP)');
        return;
      }

      // Check initial size
      if (file.size > maxSizeBytes * 2) {
        setError(`Image too large. Maximum size is ${maxSizeMB * 2}MB before compression.`);
        return;
      }

      try {
        setFileName(file.name);

        // Create preview
        const previewReader = new FileReader();
        previewReader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        previewReader.readAsDataURL(file);

        // Compress and convert to base64
        const { base64, mimeType } = await compressImage(file);
        onImageSelect(base64, mimeType);
      } catch (err) {
        setError('Failed to process image. Please try another file.');
        console.error('Image processing error:', err);
      }
    },
    [compressImage, maxSizeBytes, maxSizeMB, onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
          >
            {/* Image Preview */}
            <div className="relative aspect-video flex items-center justify-center overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />

              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <span className="text-white text-sm">Analyzing image...</span>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {fileName}
                </span>
              </div>
              <button
                onClick={handleRemove}
                disabled={isLoading}
                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
            className={`relative border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
              isDragActive
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 dark:hover:border-cyan-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className={`p-4 rounded-full ${
                  isDragActive
                    ? 'bg-cyan-100 dark:bg-cyan-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <Upload
                  className={`w-8 h-8 ${
                    isDragActive
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
              </div>

              <div className="text-center">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {isDragActive ? 'Drop your image here' : 'Drag & drop an image'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  or click to browse
                </p>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                PNG, JPG, GIF, WebP • Max {maxSizeMB}MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </motion.div>
      )}
    </div>
  );
}
