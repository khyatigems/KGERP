"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Camera, X, Upload, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar: string | null | undefined;
  currentSvgAvatar: string | null | undefined;
  history: string[];
  userName: string;
  onSave: (avatarUrl: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

type CropShape = "circle" | "rounded" | "square";

const CONTAINER_SIZE = 280;
const OUTPUT_SIZE = 512;

export function AvatarUploadModal({
  open,
  onOpenChange,
  currentAvatar,
  currentSvgAvatar,
  history,
  userName,
  onSave,
  onRemove,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [cropShape, setCropShape] = useState<CropShape>("circle");
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "history" | "preset">("upload");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setNaturalSize(null);
    setBaseScale(1);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setError("");
    setActiveTab("upload");
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum 5MB allowed.");
      return;
    }
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setActiveTab("upload");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    // "cover" fit: scale image so its smaller side fills the container
    const fit = Math.max(CONTAINER_SIZE / w, CONTAINER_SIZE / h);
    setBaseScale(fit);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartRef.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStartRef.current) return;
    const clientX = "touches" in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (dragStartRef.current) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove);
      window.addEventListener("touchend", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleMouseMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [dragStartRef.current, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
  };

  const getCroppedImage = async (): Promise<Blob | null> => {
    if (!previewUrl || !naturalSize) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        const scaleRatio = OUTPUT_SIZE / CONTAINER_SIZE;
        const finalScale = baseScale * scale;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        const drawW = naturalSize.w * finalScale * scaleRatio;
        const drawH = naturalSize.h * finalScale * scaleRatio;
        const drawX = position.x * scaleRatio;
        const drawY = position.y * scaleRatio;

        ctx.save();
        ctx.translate(OUTPUT_SIZE / 2 + drawX, OUTPUT_SIZE / 2 + drawY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        if (cropShape === "circle") {
          ctx.globalCompositeOperation = "destination-in";
          ctx.beginPath();
          ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        } else if (cropShape === "rounded") {
          ctx.globalCompositeOperation = "destination-in";
          const r = 60;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(OUTPUT_SIZE - r, 0);
          ctx.quadraticCurveTo(OUTPUT_SIZE, 0, OUTPUT_SIZE, r);
          ctx.lineTo(OUTPUT_SIZE, OUTPUT_SIZE - r);
          ctx.quadraticCurveTo(OUTPUT_SIZE, OUTPUT_SIZE, OUTPUT_SIZE - r, OUTPUT_SIZE);
          ctx.lineTo(r, OUTPUT_SIZE);
          ctx.quadraticCurveTo(0, OUTPUT_SIZE, 0, OUTPUT_SIZE - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }

        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      };
      img.src = previewUrl;
    });
  };

  const handleSaveUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const blob = await getCroppedImage();
      if (!blob) throw new Error("Failed to process image");
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      await onSave(data.avatarUrl);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFromHistory = async (url: string) => {
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/user/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to set avatar");
      await onSave(url);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove your profile photo?")) return;
    setUploading(true);
    try {
      await onRemove();
      onOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  // Render-time computed style for the preview image
  const previewStyle = useMemo(() => {
    if (!naturalSize) return {};
    const finalScale = baseScale * scale;
    return {
      top: "50%",
      left: "50%",
      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${finalScale}) rotate(${rotation}deg)`,
      transformOrigin: "center",
      width: `${naturalSize.w}px`,
      height: `${naturalSize.h}px`,
      maxWidth: "none",
      userSelect: "none" as const,
    };
  }, [naturalSize, baseScale, scale, position, rotation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-lg font-semibold">Profile photo</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload, crop, or pick from your history
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-5">
          <div className="flex border-b mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "upload" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >Upload</button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >History {history.length > 0 && `(${history.length})`}</button>
            <button
              type="button"
              onClick={() => setActiveTab("preset")}
              className={cn(
                "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "preset" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >Preset</button>
          </div>

          {error && (
            <div className="mb-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              {!previewUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer border-gray-300 dark:border-gray-700 hover:border-gray-400"
                  onClick={() => document.getElementById("avatar-file-input")?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium">Click or drag to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    ref={containerRef}
                    className="relative mx-auto bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-move"
                    style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    onWheel={handleWheel}
                  >
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="absolute select-none"
                        draggable={false}
                        onLoad={handleImageLoad}
                        onDragStart={(e) => e.preventDefault()}
                        style={previewStyle}
                      />
                    )}
                    <div
                      className="absolute inset-0 pointer-events-none ring-1 ring-black/10"
                      style={{
                        borderRadius: cropShape === "circle" ? "50%" : cropShape === "rounded" ? "16px" : "0",
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    {(["circle", "rounded", "square"] as CropShape[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCropShape(s)}
                        className={cn(
                          "h-7 w-7 border-2 transition-all",
                          cropShape === s ? "border-blue-600 bg-blue-50" : "border-gray-300"
                        )}
                        style={{
                          borderRadius: s === "circle" ? "50%" : s === "rounded" ? "6px" : "0",
                        }}
                        title={s}
                      />
                    ))}
                    <div className="w-px h-5 bg-gray-300 mx-2" />
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                      className="h-7 w-7 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >−</button>
                    <button
                      type="button"
                      onClick={() => setScale((s) => Math.min(4, s + 0.1))}
                      className="h-7 w-7 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >+</button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="h-7 px-2 border border-gray-300 rounded text-xs hover:bg-gray-50"
                    >↻</button>
                    <button
                      type="button"
                      onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); setRotation(0); }}
                      className="h-7 px-2 border border-gray-300 rounded text-xs hover:bg-gray-50"
                      title="Reset"
                    >Reset</button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setPreviewUrl(null); setSelectedFile(null); setNaturalSize(null); }}
                      className="flex-1"
                    >Cancel</Button>
                    <Button
                      type="button"
                      onClick={handleSaveUpload}
                      disabled={uploading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >{uploading ? "Uploading..." : "Save"}</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No avatar history yet</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {history.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => handleSelectFromHistory(url)}
                      disabled={uploading}
                      className="group relative aspect-square rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-full w-full rounded-full">
                        <AvatarImage src={url} />
                        <AvatarFallback>...</AvatarFallback>
                      </Avatar>
                      {currentAvatar === url && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "preset" && (
            <div className="space-y-3">
              {currentSvgAvatar ? (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setUploading(true);
                      try {
                        const res = await fetch("/api/user/avatar", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ avatarUrl: null, presetSvg: currentSvgAvatar }),
                        });
                        if (!res.ok) throw new Error("Failed");
                        const data = await res.json();
                        await onSave(data.avatarUrl ?? "");
                        onOpenChange(false);
                      } finally { setUploading(false); }
                    }}
                    disabled={uploading}
                    className="aspect-square rounded-full overflow-hidden border-2 border-blue-500 hover:border-blue-600 disabled:opacity-50"
                  >
                    <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: currentSvgAvatar }} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">No preset avatar set</div>
              )}
            </div>
          )}
        </div>

        {(currentAvatar || currentSvgAvatar) && (
          <div className="border-t bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-between">
            <span className="text-xs text-muted-foreground">Profile photo</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="text-xs text-red-600 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
