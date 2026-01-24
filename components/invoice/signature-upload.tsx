"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, File as FileIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SignatureUploadProps {
  onUploadComplete: (url: string) => void;
  defaultUrl?: string;
}

export function SignatureUpload({ onUploadComplete, defaultUrl }: SignatureUploadProps) {
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(defaultUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const file = acceptedFiles[0]; // Only one file for signature
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'signatures'); // Store in signatures folder

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const result = data.results[0];
      
      if (result && result.cloudinaryUrl) {
          setCurrentUrl(result.cloudinaryUrl);
          onUploadComplete(result.cloudinaryUrl);
      } else {
          throw new Error("No URL returned");
      }
    } catch (error) {
      console.error(error);
      setUploadError('Failed to upload signature. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const removeFile = () => {
    setCurrentUrl(undefined);
    onUploadComplete("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  if (currentUrl) {
      return (
          <div className="relative group border rounded-md p-4 w-48 h-32 flex items-center justify-center bg-gray-50">
            <div className="relative w-full h-full">
                <Image
                    src={currentUrl}
                    alt="Digital Signature"
                    fill
                    className="object-contain"
                />
            </div>
            <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
            >
                <X className="h-3 w-3" />
            </Button>
          </div>
      );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors h-32 flex flex-col items-center justify-center",
          isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
             <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                    {isDragActive ? "Drop signature..." : "Upload Signature (PNG/JPG)"}
                </p>
             </>
        )}
      </div>

      {uploadError && (
        <div className="text-xs text-red-500">
          {uploadError}
        </div>
      )}
    </div>
  )
}
