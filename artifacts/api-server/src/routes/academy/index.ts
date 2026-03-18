import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

router.get("/progress", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db
      .select({ academyProgress: usersTable.academyProgress })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let lessonIds: string[] = [];
    if (user.academyProgress) {
      try {
        lessonIds = JSON.parse(user.academyProgress);
      } catch {}
    }

    res.json({ lessonIds });
  } catch (err) {
    console.error("Get academy progress error:", err);
    res.status(500).json({ error: "Failed to get academy progress" });
  }
});

router.put("/progress", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds)) {
      res.status(400).json({ error: "lessonIds must be an array" });
      return;
    }

    const validated = lessonIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );

    await db
      .update(usersTable)
      .set({ academyProgress: JSON.stringify(validated) })
      .where(eq(usersTable.id, userId));

    res.json({ ok: true, lessonIds: validated });
  } catch (err) {
    console.error("Update academy progress error:", err);
    res.status(500).json({ error: "Failed to update academy progress" });
  }
});

export default router;
