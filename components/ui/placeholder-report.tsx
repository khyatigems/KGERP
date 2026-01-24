import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderReport({ title }: { title: string }) {
    return (
        <Card className="m-6">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                    <Construction className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                <p className="text-muted-foreground max-w-sm">
                    This report module is currently under development. Please check back later or contact the administrator.
                </p>
            </CardContent>
        </Card>
    );
}
