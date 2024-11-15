'use client'

import { useEffect } from "react";
import { devLog } from "../log/dev-log";

interface WorkerProviderProps {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
    onSubscribe?: (subscription: PushSubscription) => void;
    onMessage?: (message: { type: string; [key: string]: any }) => void;
    log?: boolean;
  }

export function WibuWorkerHandler({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    onSubscribe,
    onMessage,
    log = false
  }: WorkerProviderProps) {
    const printLog = devLog(log);
  
    useEffect(() => {
      registerServiceWorker();
    }, []);
  
    const urlB64ToUint8Array = (base64String: string): Uint8Array => {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
  
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };
    const registerServiceWorker = async () => {
      printLog("Registering service worker...");
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.register(
            "/wibu-push-worker.js",
            { scope: "/" }
          );
  
          await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
          });
  
          if (subscription) {
            printLog("Push subscription successful");
            onSubscribe?.(subscription);
          }
  
          const messageHandler = (event: MessageEvent) => {
            if (event.data?.type === "PUSH_RECEIVED") {
              printLog("Received push message:", event.data);
              onMessage?.(event.data);
            }
          };
  
          navigator.serviceWorker.addEventListener("message", messageHandler);
  
          return () => {
            navigator.serviceWorker.removeEventListener(
              "message",
              messageHandler
            );
          };
        }
      } catch (error) {
        console.warn(error);
      }
    };
  
    return null;
  }