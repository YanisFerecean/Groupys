"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";

interface NavBarAuthControlsProps {
  mobile: boolean;
  onGoToProfile: () => void;
  onCloseMobileMenu?: () => void;
  iconOnly?: boolean;
}

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
      <>
        <Show when="signed-out">
          <SignInButton>
            <button className="w-full py-3 text-slate-700 font-medium border border-slate-200 rounded-full hover:bg-slate-100 transition-colors">
              Login
            </button>
          </SignInButton>
        </Show>
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
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton>
          <button className="px-5 py-2 text-slate-600 font-medium hover:text-slate-900 transition-all">
            Login
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <button
          onClick={onGoToProfile}
          className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold scale-95 duration-200 ease-in-out hover:scale-100 transition-transform"
        >
          My Profile
        </button>
        <UserButton />
      </Show>
    </>
  );
}
