"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  categoryGemtypeImageUrls?: Record<string, string[]>;
  maxImagesPerCategory?: number;
  imagesPerDescription?: number;
  imageRotationMode?: string;
  brandLogoUrl?: string | null;
  companyName?: string | null;
  tagline?: string | null;
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
  const [categoryGemtypeImageUrls, setCategoryGemtypeImageUrls] = useState<
    Record<string, string[]>
  >(initialData?.categoryGemtypeImageUrls || {});
  const [selectedComboKey, setSelectedComboKey] = useState<string | null>(null);
  const [comboKey, setComboKey] = useState<string>("");
  const [comboImageUrls, setComboImageUrls] = useState<string[]>([""]);
  const [comboEditorError, setComboEditorError] = useState<string | null>(null);
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
  const [availableComboKeys, setAvailableComboKeys] = useState<
    Array<{ key: string; category: string; gemType: string }>
  >([]);
  const [selectedComboKeys, setSelectedComboKeys] = useState<string[]>([]);

  // Fetch available categories and category|gemType combos from inventory
  useEffect(() => {
    async function fetchInventoryMetadata() {
      try {
        const [categoriesResponse, combosResponse] = await Promise.all([
          fetch("/api/inventory/categories"),
          fetch("/api/inventory/category-gemtype-combos"),
        ]);

        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json();
          setAvailableCategories(data.categories || []);
        }

        if (combosResponse.ok) {
          const data = await combosResponse.json();
          setAvailableComboKeys(data.combos || []);
        }
      } catch (error) {
        console.error("Failed to fetch inventory metadata:", error);
      }
    }
    fetchInventoryMetadata();
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

      setComboEditorError(null);
      const result = await updateEbaySettingsAction({
        globalBannerImages: filteredGlobalImages,
        categoryGemtypeImageUrls: categoryGemtypeImageUrls,
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="categories">Category Images</TabsTrigger>
          <TabsTrigger value="combos">Category + GemType Images</TabsTrigger>
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

        <TabsContent value="combos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category + Gem Type Banner Images</CardTitle>
              <CardDescription>
                Define image sets for specific category + gem type combinations.
                Use a JSON object where keys are combination strings like
                <code>Category|GemType</code> and values are arrays of image URLs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(categoryGemtypeImageUrls).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No category + gem type combos configured yet. Enter JSON below to add them.
                </p>
              ) : (
                <div className="grid gap-4">
                  {Object.entries(categoryGemtypeImageUrls).map(([combo, urls]) => (
                    <Card key={combo}>
                      <CardHeader>
                        <CardTitle className="text-base">{combo}</CardTitle>
                        <CardDescription>
                          {urls.length} image(s)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          {urls.map((url, idx) => (
                            <div key={idx} className="rounded border overflow-hidden">
                              <img
                                src={url}
                                alt={`${combo} image ${idx + 1}`}
                                className="w-full h-28 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground break-all">
                          {JSON.stringify(urls)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedComboKey ? "Edit" : "Add"} Category + Gem Type Combo</CardTitle>
              <CardDescription>
                Use the form below to create or update a combination key and the banner images used for that selection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="comboKey">Combination Key</Label>
                <Input
                  id="comboKey"
                  value={comboKey}
                  onChange={(event) => setComboKey(event.target.value)}
                  placeholder="Example: Bracelet|Ruby"
                />
                <p className="text-xs text-muted-foreground">
                  Combination format: <code>Category|GemType</code>. The key must match the item category and gem type in inventory.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Banner Image URLs</Label>
                {comboImageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(event) => {
                        const updated = [...comboImageUrls];
                        updated[index] = event.target.value;
                        setComboImageUrls(updated);
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setComboImageUrls((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComboImageUrls((prev) => [...prev, ""])}
                >
                  Add Image URL
                </Button>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Apply to Inventory Combos</p>
                    <p className="text-xs text-muted-foreground">
                      Select one or more category|gem type combos from your current inventory. These options update automatically as inventory data changes.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedComboKeys.length} selected
                  </p>
                </div>
                {availableComboKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No category + gem type combos found in inventory yet.
                  </p>
                ) : (
                  <div className="grid max-h-64 gap-2 overflow-y-auto">
                    {availableComboKeys.map(({ key, category, gemType }) => (
                      <label
                        key={key}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <Checkbox
                          checked={selectedComboKeys.includes(key)}
                          onCheckedChange={(checked) => {
                            const isChecked = Boolean(checked);
                            if (isChecked) {
                              setComboKey("");
                            }
                            setSelectedComboKeys((prev) => {
                              if (isChecked) {
                                return prev.includes(key) ? prev : [...prev, key];
                              }
                              return prev.filter((existing) => existing !== key);
                            });
                          }}
                        />
                        <span className="text-sm">
                          {category} | {gemType}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  If you select combos here, the image URLs will be applied to all selected inventory combinations. Otherwise, enter a custom combination key above.
                </p>
              </div>

              {comboEditorError ? (
                <p className="text-sm text-destructive">{comboEditorError}</p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 flex-wrap">
                  {selectedComboKey ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedComboKey(null);
                        setComboKey("");
                        setComboImageUrls([""]);
                        setComboEditorError(null);
                      }}
                    >
                      Clear Editor
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    const normalizedKey = comboKey.trim().replace(/\s*\|\s*/g, '|');
                    const filteredUrls = comboImageUrls.map((url) => url.trim()).filter(Boolean);
                    const keysToSave = selectedComboKeys.length > 0 ? selectedComboKeys : normalizedKey ? [normalizedKey] : [];

                    if (selectedComboKeys.length > 0 && normalizedKey) {
                      setComboKey("");
                    }

                    if (keysToSave.length === 0) {
                      setComboEditorError("At least one combination key must be selected or entered.");
                      return;
                    }
                    if (filteredUrls.length === 0) {
                      setComboEditorError("At least one image URL is required.");
                      return;
                    }

                    setComboEditorError(null);
                    const updatedCombos = { ...categoryGemtypeImageUrls };
                    keysToSave.forEach((key) => {
                      updatedCombos[key] = filteredUrls;
                    });

                    const result = await updateEbaySettingsAction({
                      categoryGemtypeImageUrls: updatedCombos,
                    });

                    if (!result.success) {
                      setComboEditorError(result.error || "Failed to save combo");
                      return;
                    }

                    setCategoryGemtypeImageUrls(updatedCombos);
                    setSelectedComboKeys(keysToSave);
                    if (keysToSave.length === 1) {
                      setSelectedComboKey(keysToSave[0]);
                      setComboKey(keysToSave[0]);
                    }
                    toast.success(
                      keysToSave.length === 1
                        ? `Saved combo ${keysToSave[0]}`
                        : `Saved ${keysToSave.length} inventory combos`
                    );
                  }}
                >
                  Save Combo
                </Button>
              </div>
            </CardContent>
          </Card>
          {Object.keys(categoryGemtypeImageUrls).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Existing Combos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  {Object.entries(categoryGemtypeImageUrls).map(([combo, urls]) => (
                    <div key={combo} className="rounded-lg border p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-semibold">{combo}</p>
                          <p className="text-xs text-muted-foreground">
                            {urls.length} image(s)
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedComboKey(combo);
                              setComboKey(combo);
                              setComboImageUrls(urls.length ? urls : [""]);
                              setComboEditorError(null);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (!confirm(`Delete combo ${combo}?`)) return;
                              setCategoryGemtypeImageUrls((prev) => {
                                const next = { ...prev };
                                delete next[combo];
                                return next;
                              });
                              if (selectedComboKey === combo) {
                                setSelectedComboKey(null);
                                setComboKey("");
                                setComboImageUrls([""]);
                              }
                              toast.success(`Deleted combo ${combo}`);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
