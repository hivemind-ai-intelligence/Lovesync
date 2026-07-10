import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "./auth";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socketInstance = io(window.location.origin, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
}
