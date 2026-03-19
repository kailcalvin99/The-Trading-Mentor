import { Router } from "express";
import { db, userTagsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const tags = await db
      .select()
      .from(userTagsTable)
      .where(eq(userTagsTable.userId, userId));

    res.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        emoji: t.emoji,
        category: t.category,
      })),
    });
  } catch (err) {
    console.error("Get tags error:", err);
    res.status(500).json({ error: "Failed to get tags" });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, color, emoji, category } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (!color || typeof color !== "string") {
      res.status(400).json({ error: "color is required" });
      return;
    }

    const [tag] = await db
      .insert(userTagsTable)
      .values({
        userId,
        name: name.trim(),
        color,
        emoji: emoji || null,
        category: category || null,
      })
      .returning();

    res.json({
      tag: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        emoji: tag.emoji,
        category: tag.category,
      },
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Tag with this name already exists" });
      return;
    }
    console.error("Create tag error:", err);
    res.status(500).json({ error: "Failed to create tag" });
  }
});

router.put("/:id", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const tagId = parseInt(req.params.id as string);
    const { name, color, emoji, category } = req.body;

    if (isNaN(tagId)) {
      res.status(400).json({ error: "Invalid tag ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(userTagsTable)
      .where(and(eq(userTagsTable.id, tagId), eq(userTagsTable.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    const updates: Record<string, string | null> = {};
    if (name && typeof name === "string") updates.name = name.trim();
    if (color && typeof color === "string") updates.color = color;
    if (emoji !== undefined) updates.emoji = emoji || null;
    if (category !== undefined) updates.category = category || null;

    if (Object.keys(updates).length > 0) {
      await db
        .update(userTagsTable)
        .set(updates)
        .where(eq(userTagsTable.id, tagId));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Update tag error:", err);
    res.status(500).json({ error: "Failed to update tag" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const tagId = parseInt(req.params.id as string);

    if (isNaN(tagId)) {
      res.status(400).json({ error: "Invalid tag ID" });
      return;
    }

    const result = await db
      .delete(userTagsTable)
      .where(and(eq(userTagsTable.id, tagId), eq(userTagsTable.userId, userId)));

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete tag error:", err);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

export default router;
