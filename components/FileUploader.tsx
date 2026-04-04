'use client';

import { useState, useRef } from 'react';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileProcessed: (content: string, fileName: string, metadata?: any) => void;
  acceptedTypes?: string;
}

export default function FileUploader({
  onFileProcessed,
  acceptedTypes = '.docx,.xlsx,.txt,.json',
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload file');
      }

      setUploadStatus('success');
      onFileProcessed(data.content, data.fileName, {
        questions: data.questions,
        cleaningMetadata: data.cleaningMetadata,
      });
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />

          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supported: DOCX, Excel, TXT (Max 10MB)
          </p>
        </div>
      ) : (
        <div className={`
          border-2 rounded-lg p-6 transition-colors
          ${uploadStatus === 'success'
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : uploadStatus === 'error'
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }
        `}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : uploadStatus === 'success' ? (
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : uploadStatus === 'error' ? (
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              ) : (
                <File className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              )}

              <div className="flex-1">
                <p className={`font-semibold ${
                  uploadStatus === 'success'
                    ? 'text-green-900 dark:text-green-100'
                    : uploadStatus === 'error'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {file.name}
                </p>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>

                {isUploading && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Processing file...
                  </p>
                )}

                {uploadStatus === 'success' && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    File processed successfully!
                  </p>
                )}

                {uploadStatus === 'error' && errorMessage && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>

            {!isUploading && (
              <button
                onClick={handleRemove}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
