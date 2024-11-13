/* eslint-disable @typescript-eslint/no-explicit-any */
import webpush, { PushSubscription, SendResult } from "web-push";

// Konstanta untuk pesan error
const ERRORS = {
  NOT_INITIALIZED: "WebPush service has not been initialized",
  INVALID_SUBSCRIPTION: "Invalid push subscription",
  SEND_FAILED: "Failed to send push notification"
} as const;

// Interface untuk konfigurasi
interface WebPushConfig {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  EMAIL?: string;
  log?: boolean;
}

// Type untuk data notifikasi
interface BaseNotificationData {
  title: string;
  link: string;
}

interface NotificationPushData extends BaseNotificationData {
  body: string;
  variant: "notification";
}

interface DataPushData extends BaseNotificationData {
  body: Record<string, unknown>;
  variant: "data";
}

type PushData = NotificationPushData | DataPushData;

// Interface untuk hasil pengiriman
interface PushResult {
  subscription: PushSubscription;
  result: SendResult;
  success: boolean;
  error?: Error;
}

class WibuServerPush {
  private static _hasInit = false;
  private static readonly DEFAULT_EMAIL = "bipproduction@gmail.com";
  private static log = false;

  /**
   * Menginisialisasi service WebPush dengan konfigurasi VAPID
   * @param config - Konfigurasi WebPush
   * @throws Error jika konfigurasi tidak valid
   */
  public static init(config: WebPushConfig): void {
    try {
      const {
        NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY,
        EMAIL = this.DEFAULT_EMAIL,
        log = this.log
      } = config;

      this.log = log;
      if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error("VAPID keys are required");
      }

      webpush.setVapidDetails(
        `mailto:${EMAIL}`,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );

      this._hasInit = true;
      if (this.log) console.log("WebPush service initialized");
    } catch (error) {
      this._hasInit = false;
      throw error instanceof Error
        ? error
        : new Error("Failed to initialize WebPush");
    }
  }

  /**
   * Memeriksa apakah service telah diinisialisasi
   * @throws Error jika service belum diinisialisasi
   */
  private static checkInitialization(): void {
    if (!this._hasInit) {
      throw new Error(ERRORS.NOT_INITIALIZED);
    }
  }

  /**
   * Mengirim notifikasi ke satu subscriber
   * @param params - Parameter pengiriman
   * @returns Promise dengan hasil pengiriman
   */
  public static async sendOne({
    subscription,
    data
  }: {
    subscription: PushSubscription;
    data: PushData;
  }): Promise<PushResult> {
    try {
      this.checkInitialization();

      if (!subscription) {
        throw new Error(ERRORS.INVALID_SUBSCRIPTION);
      }

      if (this.log) {
        console.log("Sending notification to:", subscription);
        console.log("Notification data:", data);
      }
      const result = await webpush.sendNotification(
        subscription,
        JSON.stringify(data)
      );

      return {
        subscription,
        result,
        success: true
      };
    } catch (error) {
      return {
        subscription,
        result: null as any,
        success: false,
        error: error instanceof Error ? error : new Error(ERRORS.SEND_FAILED)
      };
    }
  }

  /**
   * Mengirim notifikasi ke banyak subscriber
   * @param params - Parameter pengiriman
   * @returns Promise dengan array hasil pengiriman
   */
  public static async sendMany({
    subscriptions,
    data
  }: {
    subscriptions: PushSubscription[];
    data: PushData;
  }): Promise<PushResult[]> {
    try {
      this.checkInitialization();

      if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        throw new Error("Subscriptions array is empty or invalid");
      }

      const results = await Promise.allSettled(
        subscriptions.map(async (subscription) => {
          try {
            const result = await this.sendOne({ subscription, data });
            return result;
          } catch (error) {
            return {
              subscription,
              result: null as any,
              success: false,
              error:
                error instanceof Error ? error : new Error(ERRORS.SEND_FAILED)
            };
          }
        })
      );

      if (this.log) {
        console.log("Sending notifications to:", subscriptions);
        console.log("Notification data:", data);
      }
      return results.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : {
              subscription: null as any,
              result: null as any,
              success: false,
              error: new Error("Failed to process subscription")
            }
      );
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to send notifications");
    }
  }

  /**
   * Mengecek status inisialisasi service
   * @returns Status inisialisasi
   */
  public static isInitialized(): boolean {
    return this._hasInit;
  }
}

export { WibuServerPush };
