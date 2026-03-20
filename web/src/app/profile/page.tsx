import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProfileView from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/");

  return <ProfileView />;
}
