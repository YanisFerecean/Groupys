"use client";

import { Show, UserButton } from "@clerk/nextjs";

interface NavBarAuthControlsProps {
  mobile: boolean;
  onGoToProfile: () => void;
  onCloseMobileMenu?: () => void;
  iconOnly?: boolean;
}

/**
 * Nav-bar account controls. Only already-signed-in users get anything here: the public
 * login entry point is intentionally absent while the web app isn't production ready
 * (visitors are pointed at the waitlist instead).
 */
export default function NavBarAuthControls({
  mobile,
  onGoToProfile,
  onCloseMobileMenu,
  iconOnly = false,
}: NavBarAuthControlsProps) {
  if (iconOnly) {
    return (
      <Show when="signed-in">
        <UserButton />
      </Show>
    );
  }

  if (mobile) {
    return (
      <Show when="signed-in">
        <button
          onClick={() => {
            onCloseMobileMenu?.();
            onGoToProfile();
          }}
          className="w-full py-3 bg-primary text-on-primary rounded-full font-bold text-center hover:opacity-90 transition-opacity"
        >
          My Profile
        </button>
      </Show>
    );
  }

  return (
    <Show when="signed-in">
      <button
        onClick={onGoToProfile}
        className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold scale-95 duration-200 ease-in-out hover:scale-100 transition-transform"
      >
        My Profile
      </button>
      <UserButton />
    </Show>
  );
}
