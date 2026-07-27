import { describe, expect, it, vi } from "vitest";
import { main } from "./index.js";

describe("create-ggstack CLI", () => {
  it("outputs the coming soon message", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await main();

    expect(spy).toHaveBeenCalledWith("ggstack — coming soon");
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
