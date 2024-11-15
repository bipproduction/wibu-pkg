/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useShallowEffect } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { devLog } from "../log/dev-log";

interface WorkerProviderProps {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
  onSubscribe?: (subscription: PushSubscription) => void;
  onMessage?: (message: { type: string; [key: string]: any }) => void;
  log?: boolean;
}

export class WibuSubscription {
  private static subscription: PushSubscription | null = null;

  public static setSubscription(subscription: PushSubscription): void {
    if (subscription) {
      WibuSubscription.subscription = subscription;
    } else {
      console.error("Invalid subscription provided");
    }
  }

  public static getSubscription(): PushSubscription | null {
    return WibuSubscription.subscription;
  }

  public static clearSubscription(): void {
    WibuSubscription.subscription = null;
    console.log("Subscription cleared.");
  }

  public static hasSubscription(): boolean {
    return WibuSubscription.subscription !== null;
  }
}

export function WibuPushHandlerProvider(workerOptoions: WorkerProviderProps) {
  const [permissionCameraState, setPermissionCameraState] = useState<
    string | null
  >(null);
  const [permissionMicrophoneState, setPermissionMicrophoneState] = useState<
    string | null
  >(null);
  const [permissionNotificationsState, setPermissionNotificationsState] =
    useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  function checkPermissions() {
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((result) => {
        setPermissionCameraState(result.state);
        result.onchange = () => setPermissionCameraState(result.state);
      })
      .catch(() => setPermissionCameraState("error"));

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        setPermissionMicrophoneState(result.state);
        result.onchange = () => setPermissionMicrophoneState(result.state);
      })
      .catch(() => setPermissionMicrophoneState("error"));

    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((result) => {
        setPermissionNotificationsState(result.state);
        result.onchange = () => setPermissionNotificationsState(result.state);
      })
      .catch(() => setPermissionNotificationsState("error"));
  }

  async function requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (stream) {
        setPermissionCameraState("granted");
      }

      // Setelah mendapatkan izin, hentikan kamera
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Camera permission denied:", error);
      setPermissionCameraState("denied");
    }
  }

  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stream) {
        setPermissionMicrophoneState("granted");
      }

      // Setelah mendapatkan izin, hentikan kamera
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setPermissionMicrophoneState("denied");
    }
  }

  async function requestNotificationsPermission() {
    try {
      const permission = await Notification.requestPermission();
      setPermissionNotificationsState(permission);
    } catch (error) {
      console.error("Notifications permission denied:", error);
      setPermissionNotificationsState("denied");
    }
  }

  if (
    !permissionCameraState ||
    !permissionMicrophoneState ||
    !permissionNotificationsState
  )
    return null;

  if (
    permissionCameraState !== "granted" ||
    permissionMicrophoneState !== "granted" ||
    permissionNotificationsState !== "granted"
  )
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "#fff",
          padding: "10px",
          position: "fixed",
          top: "0",
          left: "0",
          zIndex: "9999",
          width: "100%",
          height: "100vh",
          textAlign: "center"
        }}
      >
        {permissionCameraState !== "granted" && (
          <div>
            <p>Izin kamera belum diberikan.</p>
            <button onClick={requestCameraPermission}>Minta Izin Kamera</button>
          </div>
        )}

        {permissionMicrophoneState !== "granted" && (
          <div>
            <p>Izin mikrofon belum diberikan.</p>
            <button onClick={requestMicrophonePermission}>
              Minta Izin Mikrofon
            </button>
          </div>
        )}

        {permissionNotificationsState !== "granted" && (
          <div>
            <p>Izin notifikasi belum diberikan.</p>
            <button onClick={requestNotificationsPermission}>
              Minta Izin Notifikasi
            </button>
          </div>
        )}
      </div>
    );

  return (
    <div>
      <WorkerHandler {...workerOptoions} />
    </div>
  );
}

export function WorkerHandler({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  onSubscribe,
  onMessage,
  log = false
}: WorkerProviderProps) {
  const printLog = devLog(log);

  useShallowEffect(() => {
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
          WibuSubscription.setSubscription(subscription);
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
