import { describe, expect, it } from "vitest";
import { buildEmbedSrc, resolveEmbedSrc } from "@/lib/embed";

const youtubeUrl = "https://www.youtube.com/watch?v=k5foF4JA6pg";

describe("media embed audio options", () => {
  it("keeps YouTube muted before signage audio is activated", () => {
    expect(buildEmbedSrc("YOUTUBE", youtubeUrl)).toContain("mute=1");
  });

  it("enables YouTube audio and JavaScript controls after activation", () => {
    const source = resolveEmbedSrc("YOUTUBE", youtubeUrl, { muted: false });
    expect(source).toContain("mute=0");
    expect(source).toContain("enablejsapi=1");
  });
});
