"use client";

import { useUser, useReverification } from "@clerk/nextjs";
import { useState, useCallback } from "react";
import type { ProfileCustomization } from "@/types/profile";

export function useProfileCustomization() {
    const { user, isLoaded } = useUser();
    const [isSaving, setIsSaving] = useState(false);

    const profile: ProfileCustomization = (user?.unsafeMetadata as ProfileCustomization) ?? {};

    const updateProfile = useCallback(
        async (partial: Partial<ProfileCustomization>) => {
            if (!user) return;
            setIsSaving(true);
            try {
                await user.update({
                    unsafeMetadata: { ...user.unsafeMetadata, ...partial },
                });
            } finally {
                setIsSaving(false);
            }
        },
        [user],
    );

    // Wrapped with useReverification — Clerk auto-shows a verification modal
    const updateUsernameWithVerification = useReverification(
        async (newUsername: string) => {
            if (!user) return;
            await user.update({ username: newUsername });
        },
    );

    const updateUsername = useCallback(
        async (username: string) => {
            if (!user) return;
            setIsSaving(true);
            try {
                await updateUsernameWithVerification(username);
            } finally {
                setIsSaving(false);
            }
        },
        [user, updateUsernameWithVerification],
    );

    const updateProfileImage = useCallback(
        async (file: File) => {
            if (!user) return;
            setIsSaving(true);
            try {
                await user.setProfileImage({ file });
            } finally {
                setIsSaving(false);
            }
        },
        [user],
    );

    const removeProfileImage = useCallback(async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await user.setProfileImage({ file: null });
        } finally {
            setIsSaving(false);
        }
    }, [user]);

    return {
        profile,
        updateProfile,
        updateUsername,
        updateProfileImage,
        removeProfileImage,
        isLoaded,
        isSaving,
    };
}
