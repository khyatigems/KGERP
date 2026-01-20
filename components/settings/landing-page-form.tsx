"use client";

import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, History, RotateCcw, Save } from "lucide-react";
import { format } from "date-fns";
import { saveLandingPageSettings, getVersions, rollbackVersion } from "@/app/(dashboard)/settings/landing-page/actions";
import { LandingPageSettings, LandingPageSlide, LandingPageVersion } from "@prisma/client";

export type ExtendedLandingPageSettings = Omit<LandingPageSettings, "highlights"> & {
  highlights: string[];
  slides: LandingPageSlide[];
};

export type VersionHistoryItem = LandingPageVersion & {
    createdBy: {
        name: string | null;
        email: string | null;
    } | null;
};

const slideSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string()
    .min(1, "Description is required")
    .refine((val) => !/<[^>]*>/.test(val), "HTML tags are not allowed"),
  displayOrder: z.coerce.number(),
  isActive: z.boolean().default(true),
});

const configSchema = z.object({
  brandTitle: z.string(),
  subtitle: z.string().min(1, "Subtitle is required"),
  accessNotice: z.string().min(1, "Access notice is required"),
  
  slideshowEnabled: z.boolean(),
  slides: z.array(slideSchema).max(10, "Too many slides"),
  
  highlightsEnabled: z.boolean(),
  highlights: z.array(
    z.string().min(1, "Highlight cannot be empty")
    .refine((val) => !/<[^>]*>/.test(val), "HTML tags are not allowed")
  ).max(5, "Maximum 5 highlights"),
  
  whatsNewEnabled: z.boolean(),
  whatsNewText: z.string().optional().refine((val) => !val || !/<[^>]*>/.test(val), "HTML tags are not allowed"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

interface LandingPageFormProps {
  initialSettings: ExtendedLandingPageSettings;
}

export function LandingPageForm({ initialSettings }: LandingPageFormProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<VersionHistoryItem | null>(null);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      brandTitle: initialSettings.brandTitle,
      subtitle: initialSettings.subtitle,
      accessNotice: initialSettings.accessNotice,
      slideshowEnabled: initialSettings.slideshowEnabled,
      slides: initialSettings.slides || [],
      highlightsEnabled: initialSettings.highlightsEnabled,
      highlights: initialSettings.highlights || [],
      whatsNewEnabled: initialSettings.whatsNewEnabled,
      whatsNewText: initialSettings.whatsNewText || "",
    },
  });

  const { fields: slideFields, append: appendSlide, remove: removeSlide } = useFieldArray({
    control: form.control,
    name: "slides",
  });
  
  const { slideshowEnabled, highlightsEnabled, whatsNewEnabled, highlights, brandTitle, slides } = useWatch({
    control: form.control,
  }) as ConfigFormValues;
  
  const addHighlight = () => {
    if (highlights.length >= 5) return;
    const newHighlights = [...highlights, ""];
    form.setValue("highlights", newHighlights);
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    form.setValue("highlights", newHighlights);
  };

  const removeHighlight = (index: number) => {
    const newHighlights = highlights.filter((_, i) => i !== index);
    form.setValue("highlights", newHighlights);
  };

  const onSubmit = async (data: ConfigFormValues) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await saveLandingPageSettings(data as any);
      if (result.success) {
        toast.success("Landing page updated successfully.");
      } else {
        toast.error(result.message || "Failed to save settings.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const versions = await getVersions();
    setHistory(versions);
    setIsLoadingHistory(false);
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
        const result = await rollbackVersion(rollbackTarget.id);
        if (result.success) {
            toast.success("Version restored successfully.");
            setRollbackTarget(null);
            setIsHistoryOpen(false);
            window.location.reload(); 
        } else {
            toast.error(result.message || "Rollback failed.");
        }
    } catch {
        toast.error("An error occurred during rollback.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Landing Page Settings</h2>
            <p className="text-muted-foreground">Manage the internal ERP login landing page content. Changes apply immediately.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Branding Section */}
        <Card>
            <CardHeader>
                <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label>ERP Title (Read-only)</Label>
                    <Input value={brandTitle} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">The ERP name is locked for brand consistency.</p>
                </div>
                <div className="grid gap-2">
                    <Label>Subtitle</Label>
                    <Input {...form.register("subtitle")} placeholder="Internal Operations & Management Platform" />
                </div>
                <div className="grid gap-2">
                    <Label>Access Notice</Label>
                    <Input {...form.register("accessNotice")} placeholder="Authorized internal access only" />
                </div>
            </CardContent>
        </Card>

        {/* Slideshow Section */}
        <Card>
            <CardHeader>
                <CardTitle>Slideshow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Switch 
                        checked={slideshowEnabled} 
                        onCheckedChange={(checked) => form.setValue("slideshowEnabled", checked)} 
                    />
                    <Label>Enable Slideshow</Label>
                </div>
                <p className="text-xs text-muted-foreground">Controls visibility of the informational slideshow on the login page.</p>
                
                {slideshowEnabled && (
                    <div className="space-y-4 border rounded-md p-4">
                        {slideFields.map((field, index) => (
                            <div key={field.id} className="flex gap-4 items-start border-b last:border-0 pb-4 last:pb-0">
                                <div className="grid gap-4 flex-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Title</Label>
                                            <Input {...form.register(`slides.${index}.title`)} placeholder="Slide Title" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Display Order</Label>
                                            <Input type="number" {...form.register(`slides.${index}.displayOrder`)} className="w-20" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Description</Label>
                                        <Input {...form.register(`slides.${index}.description`)} placeholder="Slide Description" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch 
                                            checked={slides?.[index]?.isActive ?? true} 
                                            onCheckedChange={(checked) => form.setValue(`slides.${index}.isActive`, checked)} 
                                        />
                                        <Label className="text-sm text-muted-foreground">Active</Label>
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSlide(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        {slideFields.length < 5 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => appendSlide({ title: "", description: "", displayOrder: slideFields.length + 1, isActive: true })}>
                                <Plus className="h-4 w-4 mr-2" /> Add Slide
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Highlights Section */}
        <Card>
            <CardHeader>
                <CardTitle>Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Switch 
                        checked={highlightsEnabled} 
                        onCheckedChange={(checked) => form.setValue("highlightsEnabled", checked)} 
                    />
                    <Label>Enable Highlights</Label>
                </div>
                <p className="text-xs text-muted-foreground">Short internal capability highlights shown on the login page.</p>
                
                {highlightsEnabled && (
                    <div className="space-y-2">
                        {highlights.map((highlight, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-muted-foreground">•</span>
                                <Input 
                                    value={highlight} 
                                    onChange={(e) => updateHighlight(index, e.target.value)} 
                                    placeholder="Enter highlight text" 
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeHighlight(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        {highlights.length < 5 ? (
                            <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
                                <Plus className="h-4 w-4 mr-2" /> Add Highlight
                            </Button>
                        ) : (
                            <p className="text-xs text-amber-600">Maximum 5 highlights reached.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        {/* What's New Section */}
        <Card>
            <CardHeader>
                <CardTitle>What&apos;s New</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Switch 
                        checked={whatsNewEnabled} 
                        onCheckedChange={(checked) => form.setValue("whatsNewEnabled", checked)} 
                    />
                    <Label>Enable What&apos;s New</Label>
                </div>
                {whatsNewEnabled && (
                    <div className="grid gap-2">
                        <Textarea 
                            {...form.register("whatsNewText")} 
                            placeholder="Enter a short internal update (one line recommended)" 
                        />
                        <p className="text-xs text-muted-foreground">Used to communicate recent ERP updates to internal users.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="flex gap-4">
            <Button type="submit" className="w-full md:w-auto">
                <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => { setIsHistoryOpen(true); loadHistory(); }}>
                <History className="mr-2 h-4 w-4" /> View Version History
            </Button>
        </div>
      </form>

      {/* Version History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Landing Page Version History</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Version</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingHistory ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ) : history.map((version) => (
                            <TableRow key={version.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">v{version.versionNumber}</span>
                                        {version.isRollback && <span className="text-xs bg-amber-100 text-amber-800 px-1 rounded">Rollback</span>}
                                    </div>
                                </TableCell>
                                <TableCell>{version.createdBy?.name || "System"}</TableCell>
                                <TableCell>{format(new Date(version.createdAt), "PPpp")}</TableCell>
                                <TableCell>
                                    <Button size="sm" variant="outline" onClick={() => setRollbackTarget(version)}>
                                        <RotateCcw className="h-3 w-3 mr-1" /> Restore This Version
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={!!rollbackTarget} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Restore Landing Page Version?</DialogTitle>
                <DialogDescription>
                    This will replace the current landing page content with version v{rollbackTarget?.versionNumber}.
                    <br/><br/>
                    <strong>Rollback Rules:</strong><br/>
                    • Restored version becomes new active version<br/>
                    • Changes reflect instantly on /login
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setRollbackTarget(null)}>Cancel</Button>
                <Button onClick={handleRollback}>Restore Version</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
