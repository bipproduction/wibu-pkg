"use client";
import {
  OS,
  useIdle,
  useMounted,
  useNetwork,
  useOs,
  useShallowEffect,
  useViewportSize
} from "@mantine/hooks";
import Peer from "peerjs";
import { useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { devLog } from "../log/dev-log";


type UtilHandle = {
  os: OS;
  networkStatus: { online: boolean };
  idle: boolean;
  viewport: { height: number; width: number };
  mounted: boolean;
};

type ConfigOption<T extends "dev" | "prd"> = {
  headId: string;
  mode: T;
  config?: { host?: string; port?: number };
  log?: boolean;
  onPeerInstance?: (peer: Peer) => void;
  onUtilHandle?: (handle: UtilHandle) => void;
};

/**
 * # HANYA DI-CLIENT DAN DIPASANG SEKALI SAJA
 */
export function WibuStreamProvider<T extends "dev" | "prd">({
  headId,
  mode,
  config,
  log = false,
  onPeerInstance,
  onUtilHandle
}: ConfigOption<T>) {
  const os = useOs();
  const networkStatus = useNetwork();
  const idle = useIdle(2000);
  const { height, width } = useViewportSize();

  const peerInstanceRef = useRef<Peer | null>(null);
  const reconnectAttempts = useRef(0);
  const mounted = useMounted();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const printLog = devLog(log);

  const utilHandle = {
    os,
    networkStatus,
    idle,
    viewport: { height, width },
    mounted
  };

  const defaultHost =
    mode === "dev" ? "localhost" : "wibu-stream-server.wibudev.com";
  const defaultPort = mode === "dev" ? 3034 : 443;
  const host = config?.host ?? defaultHost;
  const port = config?.port ?? defaultPort;

  // Inisialisasi koneksi peer
  const initializePeer = () => {
    const peerId = `wibu${headId}-${uuidv4().replace(/-/g, "")}`;
    printLog("Initializing Peer with ID: " + peerId);

    const peer = new Peer(peerId, {
      host,
      port,
      secure: true,
      path: "/wibu-stream"
    });
    peerInstanceRef.current = peer;

    onPeerInstance?.(peer);
    onUtilHandle?.(utilHandle);

    peer.on("open", (id) => {
      printLog("Peer ID: " + id);
      clearReconnectTimeout();
      reconnectAttempts.current = 0;
    });

    peer.on("disconnected", () => {
      printLog("Disconnected from Peer Server", "warn");
      handleReconnect();
    });

    peer.on("error", (err) => {
      printLog("Peer Error: " + err, "error");
      handleReconnect();
    });

    return peer;
  };

  // Reconnect handling with exponential backoff
  const handleReconnect = () => {
    if (reconnectTimeoutRef.current) return;

    const delay = Math.min(3000 * 2 ** reconnectAttempts.current, 30000);
    reconnectAttempts.current += 1;
    printLog(`Attempting to reconnect in ${delay / 1000} seconds...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
        peerInstanceRef.current = null;
      }
      initializePeer();
    }, delay);
  };

  // Clear reconnect timeout if active
  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Only initialize once when mounted, cleanup on unmount
  useShallowEffect(() => {
    if (mounted && !peerInstanceRef.current) initializePeer();

    return () => {
      if (peerInstanceRef.current) {
        printLog("Destroying peer instance");
        peerInstanceRef.current.destroy();
        peerInstanceRef.current = null;
      }
      clearReconnectTimeout();
    };
  }, [mounted]);

  return null;
}
