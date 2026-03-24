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

    let isMounted = true;

    async function initWs() {
      try {
        const token = await getToken();
        if (token && isMounted) {
          chatWs.connect(token);
          // Assuming successful connect if token exists
          setIsConnected(true);
        }
      } catch (e) {
        console.error("Failed to init WS:", e);
      }
    }

    initWs();

    return () => {
      isMounted = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return { isConnected, chatWs };
}
