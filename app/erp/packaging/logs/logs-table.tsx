 "use client";
 
 import { Button } from "@/components/ui/button";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { format } from "date-fns";
 import { useRouter } from "next/navigation";
 
 type VerificationLog = {
   id: string;
   serialNumber: string;
   scannedAt: string | Date;
   ipAddress: string | null;
   userAgent: string | null;
 };
 
 export function VerificationLogsTable({
   data,
   pagination,
 }: {
   data: VerificationLog[];
   pagination: { page: number; pages: number };
 }) {
   const router = useRouter();
 
   const handlePageChange = (newPage: number) => {
     router.push(`?page=${newPage}`);
   };
 
   return (
     <div className="space-y-4">
       <div className="rounded-md border">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Serial Number</TableHead>
               <TableHead>Scanned At</TableHead>
               <TableHead>IP Address</TableHead>
               <TableHead>User Agent</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {data.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                   No verification logs found.
                 </TableCell>
               </TableRow>
             ) : (
               data.map((log) => (
                 <TableRow key={log.id}>
                   <TableCell className="font-mono font-medium">{log.serialNumber}</TableCell>
                   <TableCell>
                     {format(new Date(log.scannedAt), "MMM d, yyyy HH:mm:ss")}
                   </TableCell>
                   <TableCell>{log.ipAddress}</TableCell>
                   <TableCell className="max-w-[300px] truncate" title={log.userAgent || undefined}>
                     {log.userAgent}
                   </TableCell>
                 </TableRow>
               ))
             )}
           </TableBody>
         </Table>
       </div>
 
       <div className="flex items-center justify-end space-x-2">
         <Button
           variant="outline"
           size="sm"
           onClick={() => handlePageChange(pagination.page - 1)}
           disabled={pagination.page <= 1}
         >
           Previous
         </Button>
         <div className="text-sm text-muted-foreground">
           Page {pagination.page} of {pagination.pages}
         </div>
         <Button
           variant="outline"
           size="sm"
           onClick={() => handlePageChange(pagination.page + 1)}
           disabled={pagination.page >= pagination.pages}
         >
           Next
         </Button>
       </div>
     </div>
   );
 }
