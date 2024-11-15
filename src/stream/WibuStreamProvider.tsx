/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Peer from "peerjs";
import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useWibuCallback } from "../use-wibu/use-wibu-callback";
import { useWibuEffect } from "../use-wibu/use-wibu-effect";

// Custom Hooks untuk menggantikan Mantine hooks
const useOs = () => {
  const [os, setOs] = useState<
    "undetermined" | "macos" | "ios" | "windows" | "android" | "linux"
  >("undetermined");

  useWibuEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) {
      setOs("windows");
    } else if (userAgent.includes("mac")) {
      setOs(
        userAgent.includes("iphone") || userAgent.includes("ipad")
          ? "ios"
          : "macos"
      );
    } else if (userAgent.includes("android")) {
      setOs("android");
    } else if (userAgent.includes("linux")) {
      setOs("linux");
    }
  }, []);

  return os;
};

const useNetwork = () => {
  const [online, setOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useWibuEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online };
};

const useIdle = (timeout: number) => {
  const [idle, setIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useWibuEffect(() => {
    const handleActivity = () => {
      setIdle(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setIdle(true), timeout);
    };

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "wheel"];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    timeoutRef.current = setTimeout(() => setIdle(true), timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout]);

  return idle;
};

const useViewportSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0
  });

  useWibuEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
};

const useMounted = () => {
  const [mounted, setMounted] = useState(false);

  useWibuEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted;
};

const devLog =
  (log: boolean = false) =>
  (text: string, variant: "info" | "warn" | "error" = "info") => {
    if (log) {
      const stack = new Error().stack;
      const lineInfo = stack?.split("\n")[2];
      const match = lineInfo?.match(/(\/.*:\d+:\d+)/);
      const lineNumber = match ? match[1] : "unknown line";
      const color =
        variant === "info" ? "green" : variant === "warn" ? "yellow" : "red";
      console.log(`[${variant}]`, `[${lineNumber}] ==> ${text}`[color]);
    }
  };

// Constants
const INITIAL_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;
const IDLE_TIMEOUT = 2000;

type OS = ReturnType<typeof useOs>;

type UtilHandle = {
  os: OS;
  networkStatus: { online: boolean };
  idle: boolean;
  viewport: { height: number; width: number };
  mounted: boolean;
};

type Mode = "dev" | "prd";

interface PeerConfig {
  host?: string;
  port?: number;
}

interface ConfigOption<T extends Mode> {
  headId: string;
  mode: T;
  config?: PeerConfig;
  log?: boolean;
  onPeerInstance?: (peer: Peer) => void;
  onUtilHandle?: (handle: UtilHandle) => void;
  children?: React.ReactNode;
}

interface PeerStatus {
  isConnected: boolean;
  error: Error | null;
  id: string | null;
}

/**
 * WibuStreamProvider Component
 * Provides peer-to-peer streaming functionality with automatic reconnection
 * and utility handling.
 */
export function WibuStreamProvider<T extends Mode>({
  headId,
  mode,
  config,
  log = false,
  onPeerInstance,
  onUtilHandle,
  children
}: ConfigOption<T>) {
  // Custom Hooks
  const os = useOs();
  const networkStatus = useNetwork();
  const idle = useIdle(IDLE_TIMEOUT);
  const { height, width } = useViewportSize();
  const mounted = useMounted();

  // Refs
  const peerInstanceRef = useRef<Peer | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroying = useRef(false);

  // State
  const [peerStatus, setPeerStatus] = useState<PeerStatus>({
    isConnected: false,
    error: null,
    id: null
  });
  const [peerInstance, setPeerInstance] = useState<Peer | null>(null);

  // Utility logger
  const printLog = useWibuCallback(
    (text: string, variant: "info" | "warn" | "error" = "info") => {
      devLog(log)(text, variant);
    },
    [log]
  );

  // Server configuration
  const defaultHost =
    mode === "dev" ? "localhost" : "wibu-stream-server.wibudev.com";
  const defaultPort = mode === "dev" ? 3034 : 443;
  const host = config?.host ?? defaultHost;
  const port = config?.port ?? defaultPort;

  // Utility handle object
  const utilHandle = useWibuCallback(
    () => ({
      os,
      networkStatus,
      idle,
      viewport: { height, width },
      mounted
    }),
    [os, networkStatus, idle, height, width, mounted]
  );

  // Clear any existing reconnection timeout
  const clearReconnectTimeout = useWibuCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Clean up peer instance
  const destroyPeerInstance = useWibuCallback(() => {
    if (peerInstanceRef.current) {
      isDestroying.current = true;
      printLog("Destroying peer instance");
      peerInstanceRef.current.destroy();
      peerInstanceRef.current = null;
      setPeerInstance(null);
      setPeerStatus((prev) => ({
        ...prev,
        isConnected: false,
        id: null
      }));
      isDestroying.current = false;
    }
  }, [printLog]);

  // Initialize new peer connection
  const initializePeer = useWibuCallback(() => {
    try {
      const peerId = `wibu${headId}-${uuidv4().replace(/-/g, "")}`;
      printLog("Initializing Peer with ID: " + peerId);

      const peer = new Peer(peerId, {
        host,
        port,
        secure: true,
        path: "/wibu-stream",
        debug: log ? 3 : 0
      });

      peerInstanceRef.current = peer;
      setPeerInstance(peer);

      peer.on("open", (id) => {
        printLog("Connected with Peer ID: " + id);
        clearReconnectTimeout();
        reconnectAttempts.current = 0;
        setPeerStatus({
          isConnected: true,
          error: null,
          id
        });
        onPeerInstance?.(peer);
        onUtilHandle?.(utilHandle());
      });

      peer.on("disconnected", () => {
        printLog("Disconnected from Peer Server", "warn");
        setPeerStatus((prev) => ({
          ...prev,
          isConnected: false
        }));
        handleReconnect();
      });

      peer.on("error", (err) => {
        printLog("Peer Error: " + err.toString(), "error");
        setPeerStatus((prev) => ({
          ...prev,
          error: err
        }));
        handleReconnect();
      });

      peer.on("close", () => {
        printLog("Peer connection closed");
        setPeerStatus({
          isConnected: false,
          error: null,
          id: null
        });
      });

      return peer;
    } catch (error) {
      printLog("Failed to initialize peer", "error");
      handleReconnect();
      return null;
    }
  }, [
    headId,
    host,
    port,
    log,
    printLog,
    clearReconnectTimeout,
    onPeerInstance,
    onUtilHandle,
    utilHandle
  ]);

  // Handle reconnection with exponential backoff
  const handleReconnect = useWibuCallback(() => {
    if (reconnectTimeoutRef.current || isDestroying.current) return;

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current),
      MAX_RECONNECT_DELAY
    );

    reconnectAttempts.current += 1;
    printLog(`Attempting to reconnect in ${delay / 1000} seconds...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      destroyPeerInstance();
      initializePeer();
    }, delay);
  }, [destroyPeerInstance, initializePeer, printLog]);

  // Initialize on mount, cleanup on unmount
  useWibuEffect(() => {
    if (mounted && !peerInstanceRef.current) {
      initializePeer();
    }

    return () => {
      destroyPeerInstance();
      clearReconnectTimeout();
    };
  }, [mounted, initializePeer, destroyPeerInstance, clearReconnectTimeout]);

  // Network status monitoring
  useWibuEffect(() => {
    if (networkStatus.online && mounted && !peerInstance) {
      initializePeer();
    }
  }, [networkStatus.online, mounted, peerInstance, initializePeer]);

  if (!peerInstance) return null;

  return <>{children}</>;
}
