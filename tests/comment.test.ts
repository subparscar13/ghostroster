import { describe, expect, it } from "vitest";

import { buildSubmission, MAX_COMMENT_LEN, validate } from "../src/lib/comment";

describe("validate", () => {
  it("rejects empty / whitespace-only", () => {
    expect(validate("")).not.toBeNull();
    expect(validate("   ")).not.toBeNull();
  });
  it("rejects over-long comments", () => {
    expect(validate("x".repeat(MAX_COMMENT_LEN + 1))).not.toBeNull();
  });
  it("accepts a normal comment", () => {
    expect(validate("Loved the daily today")).toBeNull();
  });
});

describe("buildSubmission", () => {
  it("trims, defaults the name, and tags the page + subject", () => {
    expect(buildSubmission("  great game  ", "  Justin ", "/play")).toEqual({
      message: "great game",
      name: "Justin",
      page: "/play",
      _subject: "Ghost Roster comment",
    });
  });
  it("falls back to anonymous when no name given", () => {
    expect(buildSubmission("hi", "  ", "/").name).toBe("anonymous");
  });
});
