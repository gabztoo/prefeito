"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { Settings2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

function SettingsContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Profile picture upload states
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user session
        const session = await authClient.getSession();
        if (session.data?.user) {
          setUser(session.data.user);
          setName(session.data.user.name || "");
          setEmail(session.data.user.email || "");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      await authClient.updateUser({
        name,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!profileImage) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", profileImage);

      // Upload to your storage endpoint
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();

        // Update user profile with new image URL
        await authClient.updateUser({
          name,
          image: url,
        });

        setUser((prev) => (prev ? { ...prev, image: url } : null));
        setImagePreview(null);
        setProfileImage(null);
        toast.success("Profile picture updated successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-9 w-32 mb-2 bg-gray-200 dark:bg-gray-800" />
          <Skeleton className="h-5 w-80 bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="w-full max-w-4xl">
          <div className="space-y-6">
            {/* Profile Information Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-800" />
                  <Skeleton className="h-6 w-40 bg-gray-200 dark:bg-gray-800" />
                </div>
                <Skeleton className="h-4 w-72 bg-gray-200 dark:bg-gray-800" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 bg-gray-200 dark:bg-gray-800" />
                      <Skeleton className="h-8 w-12 bg-gray-200 dark:bg-gray-800" />
                      <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <Skeleton className="h-4 w-48 bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-gray-800" />
                    <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12 bg-gray-200 dark:bg-gray-800" />
                    <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>

                <Skeleton className="h-10 w-28 bg-gray-200 dark:bg-gray-800" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="w-full max-w-4xl">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and profile settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={imagePreview || user?.image || ""} />
                <AvatarFallback>
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("profile-image-input")?.click()
                    }
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "Uploading..." : "Change Photo"}
                  </Button>
                  {profileImage && (
                    <Button
                      size="sm"
                      onClick={handleUploadProfilePicture}
                      disabled={uploadingImage}
                    >
                      Save
                    </Button>
                  )}
                  {imagePreview && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImagePreview(null);
                        setProfileImage(null);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground">
                  JPG, GIF or PNG. 1MB max.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled
                />
              </div>
            </div>

            <Button onClick={handleUpdateProfile}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6">
          <div>
            <div className="h-9 w-32 mb-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md" />
            <div className="h-5 w-80 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md" />
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
