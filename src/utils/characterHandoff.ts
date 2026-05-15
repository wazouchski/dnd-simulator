import type { CombatCharacter } from "@/types/combat";

const channelName = "dnd-sim-character-import";
const sessionKey = "dnd-sim-character";
const transientStorageKey = "dnd-sim-character-handoff";

interface CharacterHandoffMessage {
  type: "character-imported";
  character: CombatCharacter;
}

interface DesktopImportEnvelope extends CharacterHandoffMessage {
  id?: string;
}

function isCharacterHandoffMessage(value: unknown): value is CharacterHandoffMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CharacterHandoffMessage>;
  return candidate.type === "character-imported" && typeof candidate.character?.name === "string";
}

export function saveSessionCharacter(character: CombatCharacter): void {
  sessionStorage.setItem(sessionKey, JSON.stringify(character));
}

export function readSessionCharacter(): CombatCharacter | undefined {
  const raw = sessionStorage.getItem(sessionKey);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as CombatCharacter;
  } catch {
    sessionStorage.removeItem(sessionKey);
    return undefined;
  }
}

export function clearSessionCharacter(): void {
  sessionStorage.removeItem(sessionKey);
}

export function publishCharacterImport(character: CombatCharacter): void {
  saveSessionCharacter(character);

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ type: "character-imported", character } satisfies CharacterHandoffMessage);
    channel.close();
  }

  localStorage.setItem(
    transientStorageKey,
    JSON.stringify({ type: "character-imported", character } satisfies CharacterHandoffMessage)
  );
  window.setTimeout(() => localStorage.removeItem(transientStorageKey), 500);
}

export async function publishDesktopImport(character: CombatCharacter): Promise<boolean> {
  try {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "character-imported", character } satisfies CharacterHandoffMessage)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function subscribeToCharacterImports(callback: (character: CombatCharacter) => void): () => void {
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(channelName) : undefined;

  function handleChannelMessage(event: MessageEvent) {
    if (isCharacterHandoffMessage(event.data)) {
      callback(event.data.character);
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== transientStorageKey || !event.newValue) {
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue);
      if (isCharacterHandoffMessage(parsed)) {
        callback(parsed.character);
      }
    } catch {
      // Ignore malformed transient handoff data.
    }
  }

  channel?.addEventListener("message", handleChannelMessage);
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.removeEventListener("message", handleChannelMessage);
    channel?.close();
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeToDesktopImports(callback: (character: CombatCharacter) => void): () => void {
  if (typeof EventSource === "undefined") {
    return () => {};
  }

  let opened = false;
  let lastId = "";
  const source = new EventSource("/api/import/events");

  source.addEventListener("open", () => {
    opened = true;
  });

  source.addEventListener("character-imported", (event) => {
    try {
      const parsed = JSON.parse(event.data) as DesktopImportEnvelope;
      if (!isCharacterHandoffMessage(parsed)) {
        return;
      }

      if (parsed.id && parsed.id === lastId) {
        return;
      }

      lastId = parsed.id ?? "";
      callback(parsed.character);
    } catch {
      // Ignore malformed desktop bridge data.
    }
  });

  source.addEventListener("error", () => {
    if (!opened) {
      source.close();
    }
  });

  return () => source.close();
}
