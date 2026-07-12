"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AvatarCropDialog } from "@/components/settings/AvatarCropDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const currentUser = useQuery(api.users.current);
  const updateUsername = useMutation(api.users.updateUsername);
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const saveAvatar = useMutation(api.users.saveAvatar);
  const changePassword = useAction(api.users.changePassword);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.username) {
      setUsername(currentUser.username);
    }
  }, [currentUser?.username]);

  useEffect(() => {
    return () => {
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
      }
    };
  }, [selectedImageSrc]);

  const handleUsernameSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingUsername(true);
    try {
      await updateUsername({ username });
      toast.success("Username updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update username");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
    }

    setSelectedImageSrc(URL.createObjectURL(file));
    setCropDialogOpen(true);
    event.target.value = "";
  };

  const handleAvatarUpload = async (blob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await saveAvatar({ storageId });
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
      throw error;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCropDialogChange = (open: boolean) => {
    setCropDialogOpen(open);
    if (!open && selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Update your profile, avatar, and password.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
            <AvatarFallback>
              {currentUser?.username?.slice(0, 2).toUpperCase() ?? "??"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploadingAvatar}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Uploading..." : "Upload avatar"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Choose an image, then crop and resize it before saving.
            </p>
          </div>
        </CardContent>
      </Card>

      <AvatarCropDialog
        open={cropDialogOpen}
        onOpenChange={handleCropDialogChange}
        imageSrc={selectedImageSrc}
        onConfirm={handleAvatarUpload}
        isUploading={isUploadingAvatar}
      />

      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleUsernameSave(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                required
              />
            </div>
            <Button type="submit" disabled={isSavingUsername}>
              {isSavingUsername ? "Saving..." : "Save username"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handlePasswordSave(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? "Saving..." : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
