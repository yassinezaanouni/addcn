/**
 * One-shot cleanup: strip the obsolete `previewEnabled` field from every
 * snippet row so we can remove it from the schema afterwards.
 *
 * Run with:
 *   pnpm exec convex run --prod cleanup:stripPreviewEnabled
 *
 * After running on every deployment, delete this file and remove the
 * `previewEnabled` line from `snippets` in schema.ts, then redeploy.
 */
import { internalMutation } from "./_generated/server";

export const stripPreviewEnabled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("snippets").collect();
    let stripped = 0;
    for (const doc of docs) {
      if ("previewEnabled" in doc && doc.previewEnabled !== undefined) {
        await ctx.db.patch(doc._id, { previewEnabled: undefined });
        stripped += 1;
      }
    }
    return { stripped, total: docs.length };
  },
});
