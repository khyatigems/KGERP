"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Note {
    id: string;
    content: string;
    color: string;
    position: number;
    createdBy: { name: string };
    createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function QuickNotes() {
    const { data: notes, error, isLoading, mutate } = useSWR<Note[]>("/api/dashboard/notes", fetcher);
    const [isAdding, setIsAdding] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState("");
    const [selectedColor, setSelectedColor] = useState("yellow");
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    const colors = [
        { name: "yellow", bg: "bg-yellow-100", border: "border-yellow-200" },
        { name: "blue", bg: "bg-blue-100", border: "border-blue-200" },
        { name: "green", bg: "bg-green-100", border: "border-green-200" },
        { name: "gray", bg: "bg-gray-100", border: "border-gray-200" },
    ];

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;

        try {
            const response = await fetch("/api/dashboard/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newNoteContent,
                    color: selectedColor,
                    position: notes ? notes.length : 0
                })
            });

            if (!response.ok) {
                throw new Error("Failed to create note");
            }

            setNewNoteContent("");
            setIsAdding(false);
            mutate();
            toast({
                title: "Note added",
                description: "Your note has been saved successfully.",
            });
        } catch (error) {
            console.error("Failed to add note", error);
            toast({
                title: "Error",
                description: "Failed to save note. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteNote = (id: string) => {
        setNoteToDelete(id);
    };

    const confirmDeleteNote = async () => {
        if (!noteToDelete) return;

        try {
            const response = await fetch(`/api/dashboard/notes?id=${noteToDelete}`, {
                method: "DELETE"
            });
            
            if (!response.ok) {
                throw new Error("Failed to delete note");
            }
            
            mutate();
            toast({
                title: "Note deleted",
                description: "The note has been removed.",
            });
        } catch (error) {
            console.error("Failed to delete note", error);
            toast({
                title: "Error",
                description: "Failed to delete note.",
                variant: "destructive"
            });
        } finally {
            setNoteToDelete(null);
        }
    };

    if (error) return <div className="text-red-500">Failed to load notes</div>;

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/50">
                <CardTitle className="text-sm font-medium">Quick Notes</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)} className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col pt-4">
                {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5" /></div>
                ) : (
                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 -mr-2" style={{ maxHeight: '300px' }}>
                        {isAdding && (
                            <div className="p-3 border rounded-lg bg-background shadow-sm space-y-2 mb-4 sticky top-0 z-10">
                                <Textarea 
                                    placeholder="Write a note..." 
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    className="resize-none min-h-[60px] text-sm"
                                />
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-1.5">
                                        {colors.map((c) => (
                                            <button
                                                key={c.name}
                                                className={`w-5 h-5 rounded-full ${c.bg} border ${c.border} transition-transform hover:scale-110 ${selectedColor === c.name ? "ring-2 ring-offset-1 ring-black scale-110" : ""}`}
                                                onClick={() => setSelectedColor(c.name)}
                                            />
                                        ))}
                                    </div>
                                    <Button size="sm" onClick={handleAddNote} className="h-7 px-3">Add</Button>
                                </div>
                            </div>
                        )}

                        {notes?.length === 0 && !isAdding && (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs py-8 border border-dashed rounded-lg bg-muted/20">
                                <p>No notes yet.</p>
                                <Button variant="link" size="sm" onClick={() => setIsAdding(true)}>Create one</Button>
                            </div>
                        )}

                        {notes?.map((note) => (
                            <div 
                                key={note.id} 
                                className={`p-3 rounded-lg border relative group transition-all hover:shadow-md ${
                                    note.color === "yellow" ? "bg-yellow-50 border-yellow-200" :
                                    note.color === "blue" ? "bg-blue-50 border-blue-200" :
                                    note.color === "green" ? "bg-green-50 border-green-200" :
                                    "bg-gray-50 border-gray-200"
                                }`}
                            >
                                <p className="text-sm whitespace-pre-wrap pr-6 text-slate-900">{note.content}</p>
                                <button 
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                                <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Note</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this note? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNoteToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteNote}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
