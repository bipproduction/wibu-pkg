/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";

// Permission Types
export type PermissionType =
  | "camera"
  | "microphone"
  | "speakers"
  | "geolocation"
  | "midi"
  | "persistent-storage"
  | "notifications"
  | "clipboard-read"
  | "clipboard-write"
  | "accelerometer"
  | "gyroscope"
  | "magnetometer"
  | "ambient-light-sensor"
  | "background-fetch"
  | "background-sync"
  | "nfc"
  | "payment-handler"
  | "push"
  | "screen-wake-lock"
  | "storage-access";

// Permission States
export type PermissionState = "granted" | "denied" | "prompt" | "error" | null;

// Permission Configuration Interface
interface PermissionConfig {
  type: PermissionType;
  title: string;
  description: string;
  buttonText: string;
  requiresHttps?: boolean;
  requiresUserGesture?: boolean;
}

// Styles Configuration Interface
interface StylesConfig {
  container: React.CSSProperties;
  button: React.CSSProperties;
  text: React.CSSProperties;
  title: React.CSSProperties;
  description: React.CSSProperties;
  permissionContainer: React.CSSProperties;
  errorText: React.CSSProperties;
}

// Props Interface
interface WibuPermissionProviderProps {
  children: React.ReactNode;
  requiredPermissions: PermissionType[];
  config?: {
    [key in PermissionType]?: Partial<Omit<PermissionConfig, "type">>;
  };
  onPermissionGranted?: () => void;
  onPermissionDenied?: (permission: PermissionType) => void;
  onError?: (error: Error, permission: PermissionType) => void;
  customStyles?: Partial<StylesConfig>;
  renderCustomUI?: (props: {
    permissions: Record<PermissionType, PermissionState>;
    requestPermission: (type: PermissionType) => Promise<void>;
    isSupported: (type: PermissionType) => boolean;
  }) => React.ReactNode;
  showUnsupportedWarning?: boolean;
  autoRequest?: boolean;
  preventScroll?: boolean;
}

// Default Styles
const defaultStyles: StylesConfig |any = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
    boxSizing: "border-box",
    overflow: "auto"
  },
  permissionContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    width: "100%",
    maxWidth: "400px"
  },
  title: {
    color: "#fff",
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
    textAlign: "center"
  },
  description: {
    color: "#fff",
    fontSize: "16px",
    marginBottom: "15px",
    textAlign: "center",
    lineHeight: 1.4
  },
  button: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    width: "100%",
    transition: "background-color 0.3s",
    ":hover": {
      backgroundColor: "#0056b3"
    }
  },
  text: {
    color: "#fff",
    margin: "10px 0",
    textAlign: "center"
  },
  errorText: {
    color: "#ff4444",
    fontSize: "14px",
    marginTop: "8px",
    textAlign: "center"
  }
};

// Default Configuration for all permission types
const defaultConfig: Record<PermissionType, PermissionConfig> = {
  camera: {
    type: "camera",
    title: "Camera Access",
    description:
      "This app needs access to your camera to provide video functionality.",
    buttonText: "Enable Camera",
    requiresHttps: true,
    requiresUserGesture: true
  },
  microphone: {
    type: "microphone",
    title: "Microphone Access",
    description:
      "This app needs access to your microphone to provide audio functionality.",
    buttonText: "Enable Microphone",
    requiresHttps: true,
    requiresUserGesture: true
  },
  geolocation: {
    type: "geolocation",
    title: "Location Access",
    description:
      "This app needs access to your location to provide location-based services.",
    buttonText: "Enable Location",
    requiresHttps: true,
    requiresUserGesture: true
  },
  notifications: {
    type: "notifications",
    title: "Notifications",
    description: "Allow us to send you notifications to keep you updated.",
    buttonText: "Enable Notifications",
    requiresHttps: true
  },
  "clipboard-read": {
    type: "clipboard-read",
    title: "Clipboard Access",
    description: "Allow us to read from your clipboard when you paste content.",
    buttonText: "Enable Clipboard Read",
    requiresHttps: true,
    requiresUserGesture: true
  },
  "clipboard-write": {
    type: "clipboard-write",
    title: "Clipboard Write Access",
    description: "Allow us to write to your clipboard when you copy content.",
    buttonText: "Enable Clipboard Write",
    requiresHttps: true
  },
  midi: {
    type: "midi",
    title: "MIDI Device Access",
    description: "Allow access to MIDI devices for audio functionality.",
    buttonText: "Enable MIDI",
    requiresHttps: true
  },
  "persistent-storage": {
    type: "persistent-storage",
    title: "Persistent Storage",
    description: "Allow us to store data persistently on your device.",
    buttonText: "Enable Storage",
    requiresHttps: true
  },
  accelerometer: {
    type: "accelerometer",
    title: "Accelerometer Access",
    description: "Allow access to device motion sensors.",
    buttonText: "Enable Accelerometer",
    requiresHttps: true
  },
  gyroscope: {
    type: "gyroscope",
    title: "Gyroscope Access",
    description: "Allow access to device orientation sensors.",
    buttonText: "Enable Gyroscope",
    requiresHttps: true
  },
  magnetometer: {
    type: "magnetometer",
    title: "Magnetometer Access",
    description: "Allow access to device compass functionality.",
    buttonText: "Enable Magnetometer",
    requiresHttps: true
  },
  "ambient-light-sensor": {
    type: "ambient-light-sensor",
    title: "Light Sensor Access",
    description: "Allow access to ambient light sensor.",
    buttonText: "Enable Light Sensor",
    requiresHttps: true
  },
  speakers: {
    type: "speakers",
    title: "Audio Output Access",
    description: "Allow access to audio output devices.",
    buttonText: "Enable Speakers"
  },
  "background-fetch": {
    type: "background-fetch",
    title: "Background Fetch",
    description: "Allow the app to fetch data in the background.",
    buttonText: "Enable Background Fetch",
    requiresHttps: true
  },
  "background-sync": {
    type: "background-sync",
    title: "Background Sync",
    description: "Allow the app to sync data in the background.",
    buttonText: "Enable Background Sync",
    requiresHttps: true
  },
  nfc: {
    type: "nfc",
    title: "NFC Access",
    description: "Allow access to NFC functionality.",
    buttonText: "Enable NFC",
    requiresHttps: true
  },
  "payment-handler": {
    type: "payment-handler",
    title: "Payment Handler",
    description: "Allow the app to handle payments.",
    buttonText: "Enable Payment Handler",
    requiresHttps: true
  },
  push: {
    type: "push",
    title: "Push Notifications",
    description: "Allow the app to receive push notifications.",
    buttonText: "Enable Push Notifications",
    requiresHttps: true
  },
  "screen-wake-lock": {
    type: "screen-wake-lock",
    title: "Screen Wake Lock",
    description: "Allow the app to prevent the screen from sleeping.",
    buttonText: "Enable Wake Lock",
    requiresHttps: true
  },
  "storage-access": {
    type: "storage-access",
    title: "Storage Access",
    description: "Allow access to cross-origin storage.",
    buttonText: "Enable Storage Access",
    requiresHttps: true
  }
};

export function WibuPermissionProvider({
  children,
  requiredPermissions,
  config = {},
  onPermissionGranted,
  onPermissionDenied,
  onError,
  customStyles = {},
  renderCustomUI,
  showUnsupportedWarning = true,
  autoRequest = false,
  preventScroll = true
}: WibuPermissionProviderProps) {
  // States
  const [permissions, setPermissions] = useState<
    Record<PermissionType, PermissionState>
  >(
    Object.fromEntries(requiredPermissions.map((p) => [p, null])) as Record<
      PermissionType,
      PermissionState
    >
  );
  const [errors, setErrors] = useState<Record<PermissionType, string>>(
    {} as Record<PermissionType, string>
  );

  // Merge styles
  const mergedStyles: StylesConfig = {
    container: { ...defaultStyles.container, ...customStyles.container },
    button: { ...defaultStyles.button, ...customStyles.button },
    text: { ...defaultStyles.text, ...customStyles.text },
    title: { ...defaultStyles.title, ...customStyles.title },
    description: { ...defaultStyles.description, ...customStyles.description },
    permissionContainer: {
      ...defaultStyles.permissionContainer,
      ...customStyles.permissionContainer
    },
    errorText: { ...defaultStyles.errorText, ...customStyles.errorText }
  };

  // Check if running in HTTPS
  const isHttps = useCallback(() => {
    if (typeof window !== "undefined") {
      return window.location.protocol === "https:";
    }
    return false;
  }, []);

  // Check if a permission is supported
  const isPermissionSupported = useCallback((type: PermissionType): boolean => {
    switch (type) {
      case "camera":
      case "microphone":
        return !!navigator?.mediaDevices?.getUserMedia;
      case "geolocation":
        return !!navigator?.geolocation;
      case "notifications":
        return !!window?.Notification;
      case "clipboard-read":
      case "clipboard-write":
        return !!navigator?.clipboard;
      case "midi":
        return !!(navigator as any)?.requestMIDIAccess;
      case "persistent-storage":
        return !!navigator?.storage?.persist;
      case "push":
        return !!window?.PushManager;
      case "screen-wake-lock":
        return !!navigator?.wakeLock;
      default:
        return "permissions" in navigator;
    }
  }, []);

  // Setup permission change listeners
  const setupPermissionChangeListeners = useCallback(
    (permission: PermissionType, result: PermissionStatus) => {
      result.onchange = () => {
        setPermissions((prev) => ({
          ...prev,
          [permission]: result.state
        }));
      };
    },
    []
  );

  // Request specific permission
  const requestSpecificPermission = async (
    type: PermissionType
  ): Promise<PermissionState> => {
    switch (type) {
      case "camera":
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          stream.getTracks().forEach((track) => track.stop());
          return "granted";
        } catch {
          return "denied";
        }

      case "microphone":
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          stream.getTracks().forEach((track) => track.stop());
          return "granted";
        } catch {
          return "denied";
        }

      case "geolocation":
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve("granted"),
            () => resolve("denied")
          );
        });

      case "notifications":
        return (await Notification.requestPermission()) as PermissionState;

      case "midi":
        try {
          await (navigator as any).requestMIDIAccess();
          return "granted";
        } catch {
          return "denied";
        }

      case "persistent-storage":
        try {
          const isPersisted = await navigator.storage.persist();
          return isPersisted ? "granted" : "denied";
        } catch {
          return "denied";
        }

      case "push":
        try {
          const registration = await navigator.serviceWorker.ready;
          const result = await registration.pushManager.permissionState({
            userVisibleOnly: true
          });
          return result as PermissionState;
        } catch {
          return "denied";
        }

      default:
        try {
          const result = await navigator.permissions.query({
            name: type as PermissionName
          });
          return result.state as PermissionState;
        } catch {
          return "denied";
        }
    }
  };

  // Request permission
  const requestPermission = useCallback(
    async (type: PermissionType) => {
      try {
        if (!isPermissionSupported(type)) {
          throw new Error(
            `Permission ${type} is not supported in this browser`
          );
        }

        const config = defaultConfig[type];
        if (config.requiresHttps && !isHttps()) {
          throw new Error(`Permission ${type} requires HTTPS`);
        }

        const newState = await requestSpecificPermission(type);
        setPermissions((prev) => ({ ...prev, [type]: newState }));

        if (newState === "granted") {
          const allGranted = requiredPermissions.every(
            (perm) =>
              (perm === type ? newState : permissions[perm]) === "granted"
          );
          if (allGranted && onPermissionGranted) {
            onPermissionGranted();
          }
        } else if (newState === "denied" && onPermissionDenied) {
          onPermissionDenied(type);
        }

        setErrors((prev) => ({ ...prev, [type]: "" }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setErrors((prev) => ({ ...prev, [type]: errorMessage }));
        setPermissions((prev) => ({ ...prev, [type]: "error" }));
        if (onError)
          onError(
            error instanceof Error ? error : new Error(errorMessage),
            type
          );
      }
    },
    [
      isPermissionSupported,
      isHttps,
      requiredPermissions,
      permissions,
      onPermissionGranted,
      onPermissionDenied,
      onError
    ]
  );

  // Check initial permissions
  const checkPermissions = useCallback(async () => {
    for (const permission of requiredPermissions) {
      try {
        if (!isPermissionSupported(permission)) {
          setPermissions((prev) => ({ ...prev, [permission]: "error" }));
          setErrors((prev) => ({
            ...prev,
            [permission]: `${permission} is not supported in this browser`
          }));
          continue;
        }

        if (defaultConfig[permission].requiresHttps && !isHttps()) {
          setPermissions((prev) => ({ ...prev, [permission]: "error" }));
          setErrors((prev) => ({
            ...prev,
            [permission]: `${permission} requires HTTPS`
          }));
          continue;
        }

        let state: PermissionState;

        switch (permission) {
          case "notifications":
            state = Notification.permission as PermissionState;
            break;

          case "geolocation":
            state = await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                () => resolve("granted"),
                () => resolve("prompt"),
                { timeout: 10 }
              );
            });
            break;

          default:
            try {
              const result = await navigator.permissions.query({
                name: permission as PermissionName
              });
              state = result.state as PermissionState;
              setupPermissionChangeListeners(permission, result);
            } catch {
              state = "error";
            }
        }

        setPermissions((prev) => ({ ...prev, [permission]: state }));
      } catch (error) {
        setPermissions((prev) => ({ ...prev, [permission]: "error" }));
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setErrors((prev) => ({ ...prev, [permission]: errorMessage }));
        if (onError)
          onError(
            error instanceof Error ? error : new Error(errorMessage),
            permission
          );
      }
    }
  }, [
    requiredPermissions,
    isPermissionSupported,
    isHttps,
    setupPermissionChangeListeners,
    onError
  ]);

  // Effect to check initial permissions
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Effect to prevent scroll if needed
  useEffect(() => {
    if (preventScroll) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [preventScroll]);

  // Effect for auto-requesting permissions
  useEffect(() => {
    if (autoRequest) {
      requiredPermissions.forEach((permission) => {
        if (permissions[permission] === "prompt") {
          requestPermission(permission);
        }
      });
    }
  }, [autoRequest, permissions, requiredPermissions, requestPermission]);

  // Check if we still need to wait for initial permission states
  const isLoading = requiredPermissions.some(
    (perm) => permissions[perm] === null
  );
  if (isLoading) return null;

  // Check if all required permissions are granted
  const allGranted = requiredPermissions.every(
    (perm) => permissions[perm] === "granted"
  );
  if (allGranted) return <>{children}</>;

  // Allow custom UI rendering
  if (renderCustomUI) {
    return (
      <>
        {renderCustomUI({
          permissions,
          requestPermission,
          isSupported: isPermissionSupported
        })}
      </>
    );
  }

  // Render default UI
  return (
    <div style={mergedStyles.container}>
      {requiredPermissions.map((permission) => {
        if (permissions[permission] === "granted") return null;

        const permConfig = {
          ...defaultConfig[permission],
          ...config[permission]
        };

        const isSupported = isPermissionSupported(permission);
        const error = errors[permission];
        const requiresHttps = permConfig.requiresHttps && !isHttps();

        return (
          <div key={permission} style={mergedStyles.permissionContainer}>
            <h3 style={mergedStyles.title}>{permConfig.title}</h3>
            <p style={mergedStyles.description}>{permConfig.description}</p>

            {!isSupported && showUnsupportedWarning && (
              <p style={mergedStyles.errorText}>
                This permission is not supported in your browser
              </p>
            )}

            {requiresHttps && (
              <p style={mergedStyles.errorText}>
                This permission requires a secure connection (HTTPS)
              </p>
            )}

            {error && <p style={mergedStyles.errorText}>{error}</p>}

            {isSupported && !requiresHttps && (
              <button
                style={mergedStyles.button}
                onClick={() => requestPermission(permission)}
                disabled={!isSupported || requiresHttps}
              >
                {permConfig.buttonText}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
