
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit } from "lucide-react";
import { toast } from "sonner";

// Mock interface for a template (client-side only for now as no schema exists)
interface ListingTemplate {
    id: string;
    name: string;
    platform: string;
    descriptionTemplate: string;
    policies: string;
}

export function ListingTemplates() {
    // In a real app, fetch this from API. For now, use state/mock.
    const [templates, setTemplates] = useState<ListingTemplate[]>([
        {
            id: "1",
            name: "Standard eBay Ring",
            platform: "eBay",
            descriptionTemplate: "Beautiful {gemstone} ring in {metal}. Weight: {weight}.",
            policies: "No returns on resized items."
        },
        {
            id: "2",
            name: "Etsy Vintage",
            platform: "Etsy",
            descriptionTemplate: "Vintage style {gemstone} piece. Handcrafted.",
            policies: "Ships within 3 days."
        }
    ]);

    const handleDelete = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        toast.success("Template deleted");
    };

    return (
                <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">About Listing Templates</p>
                        Listing Templates allow you to save reusable listing details such as descriptions, shipping policies, and return information. 
                        This speeds up the listing creation process by letting you apply these pre-defined settings to new items instantly, ensuring consistency across your listings.
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="flex flex-col justify-center items-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors h-[250px]" onClick={() => toast.info("Create Template feature coming soon")}>
                <Plus className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-muted-foreground font-medium">Create New Template</span>
            </Card>

            {templates.map(template => (
                <Card key={template.id} className="h-[250px] flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-start">
                            <span>{template.name}</span>
                            <span className="text-xs font-normal px-2 py-1 bg-secondary rounded-full">{template.platform}</span>
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                            {template.descriptionTemplate}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                            {template.policies}
                        </p>
                    </CardContent>
                    <div className="p-4 pt-0 flex justify-end gap-2">
                         <Button variant="ghost" size="icon" onClick={() => toast.info("Edit feature coming soon")}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    </div>
    );
}
