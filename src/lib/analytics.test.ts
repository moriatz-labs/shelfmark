import { describe, expect, it } from "vitest";
import { createAnalyticsEvent } from "./analytics";

describe("analytics helpers", () => {
  it("builds compact Novus/Pendo events with product context", () => {
    expect(
      createAnalyticsEvent("bookmark_created", {
        userId: "user_1",
        collectionId: "c_product",
        domain: "pendo.io",
        tagCount: 2,
      }),
    ).toEqual({
      name: "bookmark_created",
      properties: {
        app: "shelfmark",
        collectionId: "c_product",
        domain: "pendo.io",
        tagCount: 2,
        userId: "user_1",
      },
    });
  });
});
