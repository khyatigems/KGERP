"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ROLE_PERMISSIONS, PERMISSIONS, Role } from "@/lib/permissions";
import { Search, Shield, Info } from "lucide-react";

export function RolesPermissionsTable() {
  const [searchQuery, setSearchQuery] = useState("");

  const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "SALES", "ACCOUNTS", "VIEWER"];

  const formatPermission = (perm: string) => {
    return perm.split(".").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const getPermissionDescription = (perm: string) => {
    // Simple mapping for descriptions based on the permission key
    if (perm.includes("view")) return "Allows viewing of records";
    if (perm.includes("create")) return "Allows creation of new records";
    if (perm.includes("edit")) return "Allows modification of existing records";
    if (perm.includes("delete")) return "Allows deletion of records";
    if (perm.includes("manage")) return "Full administrative access";
    if (perm.includes("approve")) return "Allows approving workflows";
    return "Access to this function";
  };

  const filteredRoles = roles.filter((role) => {
    const roleName = role.toLowerCase();
    const permissions = ROLE_PERMISSIONS[role].map(p => p.toLowerCase());
    const query = searchQuery.toLowerCase();

    return (
      roleName.includes(query) ||
      permissions.some(p => p.includes(query))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles or permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Role Name</TableHead>
              <TableHead>Assigned Permissions</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[150px]">Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.map((role) => {
              const permissions = ROLE_PERMISSIONS[role];
              const isSuperAdmin = role === "SUPER_ADMIN";

              return (
                <TableRow key={role}>
                  <TableCell className="font-medium align-top">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>{role.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {isSuperAdmin ? (
                        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                          ALL PERMISSIONS
                        </Badge>
                      ) : (
                        permissions.map((perm) => (
                          <div 
                            key={perm} 
                            className="group relative flex items-center"
                            title={getPermissionDescription(perm)}
                          >
                            <Badge variant="secondary" className="cursor-help">
                              {formatPermission(perm)}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm align-top">
                    System Default
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredRoles.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No roles found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        <span>Hover over permission badges to see function details.</span>
      </div>
    </div>
  );
}
