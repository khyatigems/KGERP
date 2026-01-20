"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Trash2, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addListing, updateListing, deleteListing, getListings } from "@/app/(dashboard)/inventory/listing-actions";

const formSchema = z.object({
    platform: z.string().min(1, "Platform is required"),
    listingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    listingRef: z.string().optional(),
    listedPrice: z.coerce.number().positive("Price must be positive"),
    status: z.string().default("ACTIVE"),
});

interface Listing {
    id: string;
    platform: string;
    listingUrl: string | null;
    listingRef: string | null;
    listedPrice: number;
    status: string;
    createdAt: Date;
}

interface ListingManagerProps {
    inventoryId: string;
    sku: string;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ListingManager({ inventoryId, sku, trigger, open, onOpenChange }: ListingManagerProps) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            platform: "WHATSAPP",
            listingUrl: "",
            listingRef: "",
            listedPrice: 0,
            status: "ACTIVE",
        },
    });

    async function loadListings() {
        setIsLoading(true);
        const res = await getListings(inventoryId);
        if (res.success) {
            setListings(res.listings as Listing[]);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        if (isOpen) {
            loadListings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, inventoryId]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        const res = await addListing({ ...values, inventoryId });
        setIsSubmitting(false);

        if (res.success) {
            setShowAddForm(false);
            form.reset();
            loadListings();
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        await deleteListing(id);
        loadListings();
    }

    async function handleStatusChange(id: string, newStatus: string) {
        await updateListing(id, { status: newStatus });
        loadListings();
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Globe className="mr-2 h-4 w-4" /> Manage Listings
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Listings - {sku}</DialogTitle>
                    <DialogDescription>
                        Track where this item is listed to prevent double sales.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Listings List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Active Listings</h3>
                            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? "secondary" : "default"}>
                                {showAddForm ? "Cancel" : "Add Listing"}
                            </Button>
                        </div>

                        {showAddForm && (
                            <div className="rounded-lg border p-4 bg-muted/50">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="platform"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Platform</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger><SelectValue placeholder="Select Platform" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                                                <SelectItem value="WEBSITE">Website</SelectItem>
                                                                <SelectItem value="EBAY">eBay</SelectItem>
                                                                <SelectItem value="ETSY">Etsy</SelectItem>
                                                                <SelectItem value="AMAZON">Amazon</SelectItem>
                                                                <SelectItem value="OTHER">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="listedPrice"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Listed Price</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={form.control}
                                                name="listingUrl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>URL</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="https://..." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={form.control}
                                                name="listingRef"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Reference / ID</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. #12345" {...field} value={field.value as string} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Listing
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : listings.length === 0 ? (
                            <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                                No listings found. Add one to track where this item is being sold.
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {listings.map((listing) => (
                                    <div key={listing.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {listing.platform.substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {listing.platform}
                                                    {listing.listingUrl && (
                                                        <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {listing.listedPrice} | Ref: {listing.listingRef || "-"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select defaultValue={listing.status} onValueChange={(val) => handleStatusChange(listing.id, val)}>
                                                <SelectTrigger className="h-8 w-[100px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                                    <SelectItem value="PAUSED">Paused</SelectItem>
                                                    <SelectItem value="SOLD">Sold</SelectItem>
                                                    <SelectItem value="REMOVED">Removed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(listing.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
