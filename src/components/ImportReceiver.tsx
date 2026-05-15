"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseDdbCharacterJson } from "@/parsers/ddbCharacter";
import { publishCharacterImport, publishDesktopImport } from "@/utils/characterHandoff";
import styles from "./ImportReceiver.module.css";

type ImportStatus = "waiting" | "received" | "error";

export function ImportReceiver() {
  const [status, setStatus] = useState<ImportStatus>("waiting");
  const [message, setMessage] = useState("Waiting for a D&D Beyond character payload.");

  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== "ddb-character-payload") {
        return;
      }

      const parsed = parseDdbCharacterJson(event.data.payload);
      if (!parsed.character || parsed.errors.length) {
        setStatus("error");
        setMessage(parsed.errors.join(" ") || "The received character payload could not be parsed.");
        return;
      }

      publishCharacterImport(parsed.character);
      await publishDesktopImport(parsed.character);
      setStatus("received");
      setMessage(`${parsed.character.name} was imported. Any open simulator tab should update now.`);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <main className={styles.shell}>
      <section className={styles.panel} data-window-title="SUMMONING GATE">
        <p className={styles.eyebrow}>Import handoff</p>
        <h1>D&D Beyond character import</h1>
        <p className={styles.message}>{message}</p>
        {status === "waiting" && (
          <p className={styles.hint}>Keep this tab open while the bookmarklet sends the character data.</p>
        )}
        {status === "received" && (
          <Link className={styles.button} href="/">
            Open or refresh simulator
          </Link>
        )}
        {status === "error" && (
          <Link className={styles.button} href="/">
            Return to simulator
          </Link>
        )}
      </section>
    </main>
  );
}
