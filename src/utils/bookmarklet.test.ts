import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "@/utils/bookmarklet";

describe("bookmarklet builder", () => {
  it("uses the app origin as postMessage target origin", () => {
    const bookmarklet = buildBookmarklet("http://127.0.0.1:3001");

    expect(bookmarklet).toContain("includeCustomItems=true");
    expect(bookmarklet).toContain('open("http://127.0.0.1:3001/import/"');
    expect(bookmarklet).toContain('postMessage({type:"ddb-character-payload",payload},"http://127.0.0.1:3001")');
    expect(bookmarklet).not.toContain('postMessage({type:"ddb-character-payload",payload},"http://127.0.0.1:3001/import/")');
  });
});
