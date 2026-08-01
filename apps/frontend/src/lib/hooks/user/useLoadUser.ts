"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/user.store";
import { getMe } from "@/lib/api/index";

export const useLoadUser = () => {
  const setUser = useUserStore((s) => s.setUser);
  const finishLoading = useUserStore((s) => s.finishLoading);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'useLoadUser.ts:start',message:'useLoadUser fetch start',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      try {
        console.log("[useLoadUser] Loading user...");
        const data = await getMe();
        
        if (!cancelled) {
          console.log("[useLoadUser] User loaded:", data?.id);
          setUser(data);
          // #region agent log
          fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'useLoadUser.ts:success',message:'useLoadUser fetch success',data:{userId:data?.id},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
          // #endregion
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useLoadUser] Failed to load user:", err);
          // #region agent log
          fetch('http://127.0.0.1:7644/ingest/4ee6c70f-604f-41ee-ad41-991110d55c8b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d0fd6'},body:JSON.stringify({sessionId:'8d0fd6',location:'useLoadUser.ts:error',message:'useLoadUser fetch error',data:{error:String(err)},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
          // #endregion
        }
      } finally {
        if (!cancelled) {
          finishLoading();
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [setUser, finishLoading]);
};