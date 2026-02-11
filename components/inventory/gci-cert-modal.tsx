'use client';

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck } from "lucide-react";
import { generateGciCertificate } from "@/app/actions/gci";
import { toast } from "sonner";

interface GciCertModalProps {
  inventoryId: string;
  trigger?: React.ReactNode;
  onSuccess?: (certNumber: string) => void;
}

export function GciCertModal({ inventoryId, trigger, onSuccess }: GciCertModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [origin, setOrigin] = useState("");
  const [treatment, setTreatment] = useState("");
  const [fluorescence, setFluorescence] = useState("");
  const [comments, setComments] = useState("");

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateGciCertificate(inventoryId, {
        origin,
        treatment,
        fluorescence,
        comments
      });

      if (result.success) {
        toast.success(`Certificate ${result.certificateNumber} generated successfully!`);
        setOpen(false);
        if (onSuccess && result.certificateNumber) {
            onSuccess(result.certificateNumber);
        }
      } else {
        toast.error(result.error || "Failed to generate certificate");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            size="sm"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <ShieldCheck className="mr-2 h-3 w-3" />
            Generate GCI Cert
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create GCI Certificate</DialogTitle>
          <DialogDescription>
            Enter the gemological details below. These will appear on the certificate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="origin" className="text-right">
              Origin
            </Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Burma, Ceylon"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="treatment" className="text-right">
              Treatments
            </Label>
            <Input
              id="treatment"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="e.g. Heated, Unheated"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fluorescence" className="text-right">
              Fluorescence
            </Label>
            <Input
              id="fluorescence"
              value={fluorescence}
              onChange={(e) => setFluorescence(e.target.value)}
              placeholder="e.g. None, Faint"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comments" className="text-right">
              Comments
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Additional notes..."
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Confirm & Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
