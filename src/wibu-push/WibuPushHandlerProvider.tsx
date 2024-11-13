/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button, Stack, Title } from "@mantine/core";
import { useShallowEffect } from "@mantine/hooks";
import { useCallback, useState } from "react";
import { devLog } from "../log/dev-log";

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

interface PermissionProviderProps {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
  onSubscribe?: (subscription: PushSubscription) => void;
  onMessage?: (message: { type: string; [key: string]: any }) => void;
  log?: boolean;
  worker?: string;
}

/**
 * ### Pasang sekali aja, jangan dibanyak tempat
 */
export function WibuPushHandlerProvider({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  onSubscribe,
  onMessage,
  log = false,
  worker = "/wibu-push-worker.js"
}: PermissionProviderProps) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );

  const printLog = devLog(log);

  const updatePermissionState = (
    cameraState: PermissionState,
    microphoneState: PermissionState,
    notificationsState: PermissionState
  ) => {
    if (
      cameraState === "granted" &&
      microphoneState === "granted" &&
      notificationsState === "granted"
    ) {
      setPermissionGranted(true);
    } else if (
      cameraState === "denied" ||
      microphoneState === "denied" ||
      notificationsState === "denied"
    ) {
      setPermissionGranted(false);
    } else {
      setPermissionGranted(null);
    }
  };

  const checkPermissions = async () => {
    try {
      printLog("Requesting camera, microphone, and notifications permissions");
      const [cameraStatus, microphoneStatus, notificationsStatus] =
        await Promise.all([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
          navigator.permissions.query({
            name: "notifications" as PermissionName
          })
        ]);

      updatePermissionState(
        cameraStatus.state,
        microphoneStatus.state,
        notificationsStatus.state
      );

      const handlePermissionChange = () => {
        updatePermissionState(
          cameraStatus.state,
          microphoneStatus.state,
          notificationsStatus.state
        );
      };

      cameraStatus.onchange = handlePermissionChange;
      microphoneStatus.onchange = handlePermissionChange;
      notificationsStatus.onchange = handlePermissionChange;

      return () => {
        cameraStatus.onchange = null;
        microphoneStatus.onchange = null;
        notificationsStatus.onchange = null;
      };
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const registerServiceWorker = async () => {
    printLog("Registering service worker...");
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.register(
          worker,
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
      console.error(
        "Error with service worker registration or push subscription:",
        error
      );
    }
  };

  useShallowEffect(() => {
    const permissionsRequested = localStorage.getItem("permissionsRequested");
    if (!permissionsRequested) {
      printLog("Requesting permissions...");
      checkPermissions().then(registerServiceWorker).catch(console.error);
    } else {
      printLog("Permissions already requested");
      registerServiceWorker();
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionGranted(true);
      localStorage.setItem("permissionsRequested", "true");
    } catch (error) {
      console.error("Camera or microphone permission denied:", error);
      setPermissionGranted(false);
    }
  }, []);

  if (permissionGranted === false) {
    return (
      <Stack
        bg="red"
        pos="fixed"
        w="100%"
        h="100%"
        justify="center"
        align="center"
      >
        <Stack>
          <Title>Permission Denied</Title>
          <Button onClick={requestPermissions}>Request Permissions</Button>
        </Stack>
      </Stack>
    );
  }

  return null;
}

const urlB64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
