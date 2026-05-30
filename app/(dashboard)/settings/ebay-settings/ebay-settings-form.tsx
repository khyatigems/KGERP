"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2 } from "lucide-react";
import { updateEbaySettingsAction, deleteCategoryImagesAction } from "@/app/settings/ebay/actions";
import { CategoryImageEditor } from "./category-image-editor";

interface EbaySettingsData {
  id?: string;
  globalBannerImages?: string[];
  categoryImageUrls?: Record<string, string[]>;
  maxImagesPerCategory?: number;
  imagesPerDescription?: number;
  imageRotationMode?: string;
  brandLogoUrl?: string;
  companyName?: string;
  tagline?: string;
}

interface EbaySettingsFormProps {
  initialData: EbaySettingsData | null;
}

export function EbaySettingsForm({ initialData }: EbaySettingsFormProps) {
  const [globalImages, setGlobalImages] = useState<string[]>(
    initialData?.globalBannerImages || []
  );
  const [categoryImages, setCategoryImages] = useState<Record<string, string[]>>(
    initialData?.categoryImageUrls || {}
  );
  const [maxImagesPerCategory, setMaxImagesPerCategory] = useState(
    String(initialData?.maxImagesPerCategory || 4)
  );
  const [imagesPerDescription, setImagesPerDescription] = useState(
    String(initialData?.imagesPerDescription || 2)
  );
  const [rotationMode, setRotationMode] = useState(
    initialData?.imageRotationMode || "RANDOM"
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState(
    initialData?.brandLogoUrl || ""
  );
  const [companyName, setCompanyName] = useState(
    initialData?.companyName || "KhyatiGems"
  );
  const [tagline, setTagline] = useState(
    initialData?.tagline || "Precious Gems for your Precious Ones"
  );

  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Fetch available categories from inventory
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/inventory/categories");
        if (response.ok) {
          const data = await response.json();
          setAvailableCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  const configuredCategories = Object.keys(categoryImages).sort();

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Validate global image URLs
      const filteredGlobalImages = globalImages.filter((url) => url.trim().length > 0);
      const validationPromises = filteredGlobalImages.map(url => 
        fetch('/api/ebay/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        }).then(res => res.json())
      );
      
      const validationResults = await Promise.all(validationPromises);
      const invalidImage = validationResults.find(result => !result.valid);
      if (invalidImage) {
        toast.error(invalidImage.error || "One or more global image URLs are invalid");
        setIsLoading(false);
        return;
      }

      const result = await updateEbaySettingsAction({
        globalBannerImages: filteredGlobalImages,
        maxImagesPerCategory: parseInt(maxImagesPerCategory) || 4,
        imagesPerDescription: parseInt(imagesPerDescription) || 2,
        imageRotationMode: rotationMode,
        brandLogoUrl: brandLogoUrl.trim() || undefined,
        companyName,
        tagline,
      });

      if (result.success) {
        toast.success("Settings saved successfully");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Delete images for "${category}"?`)) return;

    setIsLoading(true);
    try {
      const result = await deleteCategoryImagesAction(category);

      if (result.success) {
        setCategoryImages((prev) => {
          const updated = { ...prev };
          delete updated[category];
          return updated;
        });
        toast.success(`Category "${category}" deleted`);
      } else {
        toast.error(result.error || "Failed to delete category");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryImagesSaved = (category: string, images: string[]) => {
    setCategoryImages((prev) => ({
      ...prev,
      [category]: images,
    }));
    setEditingCategory(null);
    toast.success(`Images saved for "${category}"`);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="categories">Category Images</TabsTrigger>
        </TabsList>

        {/* Global Settings Tab */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
              <CardDescription>
                Configure brand details used in eBay descriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="KhyatiGems"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Precious Gems for your Precious Ones"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandLogo">Brand Logo URL</Label>
                <Input
                  id="brandLogo"
                  type="url"
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {brandLogoUrl && (
                  <div className="mt-2">
                    <img
                      src={brandLogoUrl}
                      alt="Brand Logo Preview"
                      className="h-16 w-auto rounded border"
                      onError={() =>
                        toast.error("Failed to load logo image")
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default/Global Banner Images</CardTitle>
              <CardDescription>
                These images are used as fallback when no category-specific images are configured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[0, 1].map((idx) => (
                <div key={idx} className="space-y-2">
                  <Label htmlFor={`globalImage${idx}`}>
                    Global Image {idx + 1}
                  </Label>
                  <Input
                    id={`globalImage${idx}`}
                    type="url"
                    value={globalImages[idx] || ""}
                    onChange={(e) => {
                      const updated = [...globalImages];
                      updated[idx] = e.target.value;
                      setGlobalImages(updated);
                    }}
                    placeholder="https://example.com/banner.jpg"
                  />
                  {globalImages[idx] && (
                    <div className="mt-2">
                      <img
                        src={globalImages[idx]}
                        alt={`Global Banner ${idx + 1}`}
                        className="max-h-48 w-full object-cover rounded border"
                        onError={() =>
                          toast.error(`Failed to load image ${idx + 1}`)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>
                Configure how images are displayed in eBay descriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rotationMode">Image Rotation Mode</Label>
                <Select value={rotationMode} onValueChange={setRotationMode}>
                  <SelectTrigger id="rotationMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEQUENTIAL">
                      Sequential (rotate through images)
                    </SelectItem>
                    <SelectItem value="RANDOM">
                      Random (pick random images)
                    </SelectItem>
                    <SelectItem value="FIRST">
                      First (always use first N images)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  SEQUENTIAL: Cycles through images each time. RANDOM: Picks
                  random images. FIRST: Always uses the first images.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPerCategory">
                  Max Images Per Category
                </Label>
                <Input
                  id="maxPerCategory"
                  type="number"
                  min="1"
                  max="10"
                  value={maxImagesPerCategory}
                  onChange={(e) => setMaxImagesPerCategory(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of images you can store for each category
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagesPerDesc">
                  Images Per Description
                </Label>
                <Input
                  id="imagesPerDesc"
                  type="number"
                  min="1"
                  max="5"
                  value={imagesPerDescription}
                  onChange={(e) => setImagesPerDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How many images to include in each generated description
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Global Settings
          </Button>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {configuredCategories.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No categories configured yet. Add images for a new category below.
                </p>
              </CardContent>
            </Card>
          ) : (
            configuredCategories.map((category) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <CardDescription>
                        {categoryImages[category]?.length || 0} image(s) configured
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {categoryImages[category]?.map((url, idx) => (
                      <div key={idx} className="rounded border overflow-hidden">
                        <img
                          src={url}
                          alt={`${category} image ${idx + 1}`}
                          className="w-full h-32 object-cover"
                          onError={() =>
                            toast.error(
                              `Failed to load image ${idx + 1} for ${category}`
                            )
                          }
                        />
                        <p className="text-xs text-muted-foreground p-2 truncate">
                          {url}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <Card>
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
              <CardDescription>
                Configure images for a new product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryImageEditor
                category={editingCategory || ""}
                initialImages={editingCategory ? categoryImages[editingCategory] || [] : []}
                onSave={handleCategoryImagesSaved}
                isOpen={editingCategory !== null}
                onOpenChange={(open) => {
                  if (open && !editingCategory) {
                    setEditingCategory(""); // Open for new category
                  } else if (!open) {
                    setEditingCategory(null);
                  }
                }}
                availableCategories={availableCategories}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
