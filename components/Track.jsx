"use client";

import { useEffect, useRef } from "react";
import { track } from "../lib/analytics";

// Fires one analytics event when a server-rendered page mounts.
//
// A component rather than an inline effect so server pages stay server pages —
// dropping <Track/> into a route is the whole integration.
export default function Track({ name, eventId = null, props }) {
  const sent = useRef(false);

  useEffect(() => {
    // React 18 StrictMode double-mounts in development; without this guard the
    // funnel would show twice the traffic locally.
    if (sent.current) return;
    sent.current = true;
    track(name, { eventId, props });
  }, [name, eventId, props]);

  return null;
}
