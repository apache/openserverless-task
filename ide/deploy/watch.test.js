import { describe, expect, test } from "bun:test";
import { watcherOptions } from "./watch.js";

describe("development watcher", () => {
  test("waits for generated wrappers to finish multi-write updates", () => {
    expect(watcherOptions.awaitWriteFinish).toEqual({
      stabilityThreshold: 500,
      pollInterval: 100,
    });
  });
});
