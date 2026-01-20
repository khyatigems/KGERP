"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, File as FileIcon, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUploadComplete: (results: { url: string; driveId?: string }[]) => void;
  defaultFiles?: string[];
  sku?: string;
  category?: string;
}

export function FileUpload({ onUploadComplete, defaultFiles = [], sku, category }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string; driveId?: string; driveError?: string }[]>(
    defaultFiles.map(url => ({ url, name: url.split('/').pop() || 'Image' }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('file', file);
    });
    if (sku) {
      formData.append('sku', sku);
    }
    if (category) {
      formData.append('category', category);
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const newFiles = data.results.map((res: { cloudinaryUrl: string; fileName: string; driveFileId?: string; driveError?: string }) => ({
        url: res.cloudinaryUrl,
        name: res.fileName,
        driveId: res.driveFileId,
        driveError: res.driveError
      }));

      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      onUploadComplete(updatedFiles); // Pass full list back to parent
    } catch (error) {
      console.error(error);
      setUploadError('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, onUploadComplete, sku, category]);

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'video/*': ['.mp4', '.mov']
    },
    maxFiles: 20,
    disabled: isUploading
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? "Drop the files here..." : "Drag & drop files here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supports Images & Videos (Max 20 files)
          </p>
        </div>
      </div>

      {isUploading && (
        <div className="text-sm text-center text-muted-foreground animate-pulse">
          Uploading files to Cloudinary & Drive...
        </div>
      )}

      {uploadError && (
        <div className="text-sm text-center text-red-500 flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {uploadError}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="relative group border rounded-md p-2">
              <div className="aspect-square relative mb-2 overflow-hidden rounded-md bg-muted">
                {file.url.match(/\.(mp4|mov)$/i) ? (
                  <div className="flex items-center justify-center h-full">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                ) : (
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="text-xs truncate px-1">
                {file.name}
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                 {file.driveId ? (
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                 ) : (
                    <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                 )}
                 <span className={cn(
                    "text-[10px] font-medium",
                    file.driveId ? "text-green-600" : "text-red-600"
                 )}>
                   {file.driveId ? "Synced" : (file.driveError ? "Drive Error" : "Cloudinary Only")}
                 </span>
              </div>
              {file.driveError && (
                  <div 
                    className="px-1 text-[9px] text-red-500 break-all leading-tight mt-0.5 max-h-[40px] overflow-y-auto scrollbar-none" 
                    title={file.driveError}
                  >
                      {file.driveError.includes("Enable it by visiting") ? (
                          <a 
                            href={file.driveError.match(/https:\/\/[^\s]+/)?.[0]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-red-700 block"
                            onClick={(e) => e.stopPropagation()}
                          >
                             API Disabled (Click to Enable)
                          </a>
                      ) : (
                          file.driveError
                      )}
                  </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
