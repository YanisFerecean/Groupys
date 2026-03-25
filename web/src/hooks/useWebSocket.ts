import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { chatWs } from "@/lib/ws";

export function useWebSocket() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      chatWs.disconnect();
      setIsConnected(false);
      return;
    }

    // Pass the getToken callback — ws.ts calls it fresh on every (re)connect
    chatWs.connect(getToken);
    setIsConnected(true);

    return () => {};
  }, [getToken, isLoaded, isSignedIn]);

  return { isConnected, chatWs };
}
