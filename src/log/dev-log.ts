import _ from "lodash";
import "colors";
export const devLog =
  (log: boolean = false) =>
  (text: string, variant: "info" | "warn" | "error" = "info") => {
    if (log) {
      const stack = new Error().stack;
      const lineInfo = stack?.split("\n")[2]; // Ambil baris ke-2 dari stack trace
      const match = lineInfo?.match(/(\/.*:\d+:\d+)/); // Regex untuk mengambil file, baris, dan kolom
      const lineNumber = match ? match[1] : "unknown line";
      const color =
        variant === "info" ? "green" : variant === "warn" ? "yellow" : "red";
      console.log(
        `[${variant}]`.green,
        `[${lineNumber}] ==> ${text}`[color]
      );
    }
  };
