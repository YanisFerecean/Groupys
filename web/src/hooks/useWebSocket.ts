import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { chatWs } from "@/lib/ws";

export function useWebSocket() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      chatWs.disconnect();
      return;
    }

    chatWs.connect(getToken);

    // Disconnect when the browser stores the page in bfcache (or unloads),
    // then reconnect if the page is restored from bfcache.
    // This is required for the page to be eligible for bfcache.
    const handlePageHide = () => chatWs.disconnect();
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) chatWs.connect(getToken);
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return { isConnected: !!(isLoaded && isSignedIn), chatWs };
}
