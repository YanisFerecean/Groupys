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

    // Pass the getToken callback — ws.ts calls it fresh on every (re)connect
    chatWs.connect(getToken);

    return () => {};
  }, [getToken, isLoaded, isSignedIn]);

  return { isConnected: !!(isLoaded && isSignedIn), chatWs };
}
