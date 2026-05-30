"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, X, Upload } from "lucide-react";
import { updateCategoryImagesAction } from "@/app/settings/ebay/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

async function validateImageUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required and must be a string" };
  }

  try {
    new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      // @ts-ignore
      timeout: 5000,
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Image not accessible (HTTP ${response.status})`,
      };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      return { valid: false, error: "URL is not an image" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Could not validate URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

interface CategoryImageEditorProps {
  category: string;
  initialImages: string[];
  onSave: (category: string, images: string[]) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  availableCategories?: string[];
}

export function CategoryImageEditor({
  category: initialCategory,
  initialImages,
  onSave,
  isOpen: controlledIsOpen,
  onOpenChange,
  availableCategories = [],
}: CategoryImageEditorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [images, setImages] = useState<string[]>(initialImages);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const maxImages = 4;
  const canAddMore = images.length < maxImages;

  const handleAddImage = () => {
    if (canAddMore) {
      setImages([...images, ""]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageChange = (index: number, url: string) => {
    const updated = [...images];
    updated[index] = url;
    setImages(updated);
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingIndex(index);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/ebay/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.url) {
        const updated = [...images];
        updated[index] = result.url;
        setImages(updated);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(result.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    if (!category.trim()) {
      toast.error("Category name is required");
      return;
    }

    const filteredImages = images.filter((url) => url.trim().length > 0);

    if (filteredImages.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    // Validate all image URLs
    setIsLoading(true);
    const validationPromises = filteredImages.map(url => validateImageUrl(url));
    const validationResults = await Promise.all(validationPromises);
    
    const invalidImage = validationResults.find(result => !result.valid);
    if (invalidImage) {
      toast.error(invalidImage.error || "One or more image URLs are invalid");
      setIsLoading(false);
      return;
    }

    try {
      const result = await updateCategoryImagesAction(category, filteredImages);

      if (result.success) {
        onSave(category, filteredImages);
        setCategory("");
        setImages([]);
        setIsOpen(false);
      } else {
        toast.error(result.error || "Failed to save images");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!initialCategory && (
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add New Category
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialCategory ? "Edit" : "Add"} Category Images
          </DialogTitle>
          <DialogDescription>
            Add up to {maxImages} images for a product category. Images will be
            used in eBay descriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!initialCategory && (
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              {availableCategories.length > 0 ? (
                <Select 
                  value={category} 
                  onValueChange={setCategory}
                >
                  <SelectTrigger id="categoryName">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="categoryName"
                  placeholder="e.g., Figure Idol, Bracelet, Loose Gemstone"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {availableCategories.length > 0 
                  ? "Select from existing categories in your inventory"
                  : "Must match exactly with category names in your inventory"
                }
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Images ({images.length}/{maxImages})</Label>
              {canAddMore && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImage}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Image
                </Button>
              )}
            </div>

            {images.map((imageUrl, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`image-${index}`}>
                    Image {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    id={`image-${index}`}
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) =>
                      handleImageChange(index, e.target.value)
                    }
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      id={`file-upload-${index}`}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(index, file);
                      }}
                      disabled={uploadingIndex === index}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`file-upload-${index}`)?.click()}
                      disabled={uploadingIndex === index}
                    >
                      {uploadingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {imageUrl && (
                  <div className="mt-3">
                    <img
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      className="w-full h-40 object-cover rounded border"
                      onError={() =>
                        toast.error(
                          `Failed to load image ${index + 1}. Check the URL.`
                        )
                      }
                    />
                  </div>
                )}
              </div>
            ))}

            {images.length === 0 && (
              <div className="p-8 border-2 border-dashed rounded-lg text-center">
                <p className="text-muted-foreground">
                  No images added yet. Click "Add Image" to get started.
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>💡 Tip:</strong> Upload images to a CDN (like Cloudinary,
              AWS S3, or ImageKit) and paste the public URL here. Images should
              be 1440px wide and 400-600px tall for best results.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Images
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
