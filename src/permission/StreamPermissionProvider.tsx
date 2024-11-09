"use client";
import { Button, Stack, Title } from "@mantine/core";
import { useEffect, useState } from "react";

export function StreamPermissionProvider() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const cameraStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
        const microphoneStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });

        updatePermissionState(cameraStatus.state, microphoneStatus.state);

        // Tambahkan listener untuk perubahan status izin
        cameraStatus.onchange = () => {
          updatePermissionState(cameraStatus.state, microphoneStatus.state);
        };
        microphoneStatus.onchange = () => {
          updatePermissionState(cameraStatus.state, microphoneStatus.state);
        };
      } catch (error) {
        console.error("Kesalahan saat memeriksa izin:", error);
      }
    };

    checkPermissions();
  }, []);

  const updatePermissionState = (cameraState: string, microphoneState: string) => {
    if (cameraState === "granted" && microphoneState === "granted") {
      setPermissionGranted(true);
    } else if (cameraState === "denied" || microphoneState === "denied") {
      setPermissionGranted(false);
    } else {
      setPermissionGranted(null); // Jika izin belum diberikan
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Setelah izin diberikan, matikan stream untuk menghemat sumber daya
      stream.getTracks().forEach((track) => track.stop());
      setPermissionGranted(true);
      localStorage.setItem("permissionsRequested", "true");
    } catch (error) {
      console.error("Izin kamera atau mikrofon ditolak", error);
      setPermissionGranted(false);
    }
  };

  if (permissionGranted === false) {
    return (
      <Stack
        bg={"red"}
        pos={"fixed"}
        w={"100%"}
        h={"100%"}
        justify={"center"}
        align={"center"}
      >
        <Stack>
          <Title>Permission Denied</Title>
          <Button onClick={requestPermissions}>Request Permissions</Button>
        </Stack>
      </Stack>
    );
  }

  return null; // Mengembalikan null jika izin sudah diberikan
}