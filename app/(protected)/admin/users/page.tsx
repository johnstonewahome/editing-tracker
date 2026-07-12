"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsersPage() {
  const users = useQuery(api.users.listUsers);
  const currentUser = useQuery(api.users.current);
  const promoteToAdmin = useMutation(api.users.promoteToAdmin);

  const handlePromote = async (userId: Id<"users">) => {
    try {
      await promoteToAdmin({ userId });
      toast.success("User promoted to admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to promote user");
    }
  };

  if (currentUser === undefined || users === undefined) {
    return <p className="text-muted-foreground">Loading users...</p>;
  }

  if (currentUser.role !== "admin") {
    return <p>You do not have access to this page.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User management</h1>
        <p className="text-muted-foreground">
          Promote trusted users to admin so they can manage the workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <div
              key={user._id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
                {user.role !== "admin" && (
                  <Button size="sm" onClick={() => void handlePromote(user._id)}>
                    Make admin
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
