"use client";

import { useEffect } from "react";
import { socket } from "./socket";
import { useSocketStore } from "./socket-store";

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const { setStatus } = useSocketStore.getState();

    // #region agent log
    fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'socketProvider.tsx:mount',message:'SocketProvider effect start',data:{socketConnected:socket.connected,socketActive:socket.active,storeStatus:useSocketStore.getState().status,tabId:typeof window!=='undefined'?window.name||'unnamed':'ssr'},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
    // #endregion

    const onConnect = () => {
      // #region agent log
      fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'socketProvider.tsx:onConnect',message:'Socket connect event',data:{socketId:socket.id},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setStatus("connected");
    };

    const onDisconnect = (reason: string) => {
      // #region agent log
      fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'socketProvider.tsx:onDisconnect',message:'Socket disconnect event',data:{reason},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setStatus("disconnected");
    };

    const onConnectError = (err: Error) => {
      // #region agent log
      fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'socketProvider.tsx:onConnectError',message:'Socket connect_error event',data:{message:err?.message},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setStatus("disconnected");
    };

    if (socket.connected) {
      setStatus("connected");
    } else {
      setStatus("connecting");
      socket.connect();
    }

    // #region agent log
    fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'socketProvider.tsx:afterConnect',message:'After socket.connect call',data:{socketConnected:socket.connected,socketActive:socket.active,storeStatus:useSocketStore.getState().status},timestamp:Date.now(),hypothesisId:'B-C'})}).catch(()=>{});
    // #endregion

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'socketProvider.tsx:cleanup',message:'SocketProvider effect cleanup',data:{socketConnected:socket.connected},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return children;
}
