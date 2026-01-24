"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ActivityLog {
    id: string;
    entityType: string;
    actionType: string;
    entityIdentifier: string;
    timestamp: string;
    userName: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ActivityFeed() {
    const { data: activities, error, isLoading } = useSWR<ActivityLog[]>("/api/dashboard/activity", fetcher);

    if (error) return <div className="text-red-500">Failed to load activity</div>;

    return (
        <Card className="h-full flex flex-col max-h-[800px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/activity-log" className="text-xs text-muted-foreground hover:text-primary">
                        View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5" /></div>
                ) : (
                    <div className="space-y-4">
                        {Array.isArray(activities) ? activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                        <span className="capitalize text-muted-foreground">{activity.actionType.toLowerCase().replace('_', ' ')}</span>{" "}
                                        <span className="text-foreground">{activity.entityType}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {activity.entityIdentifier}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                        <span>{activity.userName || "System"}</span>
                                        <span>•</span>
                                        <span>{new Date(activity.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-red-500 text-xs">
                                Failed to load activity feed.
                            </div>
                        )}
                         {Array.isArray(activities) && activities.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                                No recent activity.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
