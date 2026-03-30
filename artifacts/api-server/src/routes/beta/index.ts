import { Router } from "express";
import { db, usersTable, betaFeedbackLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";
import { sendEmail } from "../../email/sendEmail";

const router = Router();

router.post("/feedback", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isAllowed = user.role === "admin" || user.isBetaTester === true;
    if (!isAllowed) {
      res.status(403).json({ error: "Only beta testers and admins can submit feedback" });
      return;
    }

    const body = req.body as {
      category?: string;
      description?: string;
      rating?: number;
      pageContext?: string;
      page_context?: string;
    };
    const { category, description, rating } = body;
    const pageContext = body.pageContext ?? body.page_context;

    if (!category || !description || !rating) {
      res.status(400).json({ error: "category, description, and rating are required" });
      return;
    }

    const validCategories = ["Bug", "Suggestion", "Usability Issue", "General Feedback"];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
      return;
    }

    if (typeof description !== "string" || description.trim().length < 5) {
      res.status(400).json({ error: "Description is too short" });
      return;
    }

    const submitterRole = user.role === "admin" ? "admin" : "beta_tester";

    const [log] = await db.insert(betaFeedbackLogsTable).values({
      userId,
      submitterRole,
      category,
      description: description.trim(),
      rating: ratingNum,
      pageContext: typeof pageContext === "string" ? pageContext.trim() || null : null,
    }).returning();

    function escHtml(str: string): string {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    const ratingStars = "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);
    const submittedAt = new Date(log.createdAt).toLocaleString("en-GB", {
      timeZone: "UTC",
      dateStyle: "full",
      timeStyle: "short",
    }) + " UTC";

    const emailHtml = `
<html><body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
    <div style="background: #1a1a2e; padding: 20px 24px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px;">New Beta Feedback Submitted</h1>
      <p style="color: #a0a0b0; margin: 4px 0 0; font-size: 13px;">${submittedAt}</p>
    </div>
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px; width: 140px; vertical-align: top;">Submitted by</td><td style="padding: 8px 0; font-size: 13px; font-weight: 600;">${escHtml(user.name)} &lt;${escHtml(user.email)}&gt;</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px; vertical-align: top;">Role</td><td style="padding: 8px 0;"><span style="background: ${submitterRole === "admin" ? "#7c3aed" : "#0891b2"}; color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 700;">${submitterRole === "admin" ? "Admin" : "Beta Tester"}</span></td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px; vertical-align: top;">Category</td><td style="padding: 8px 0; font-size: 13px;">${escHtml(category)}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px; vertical-align: top;">Rating</td><td style="padding: 8px 0; font-size: 16px; color: #f59e0b;">${ratingStars} (${ratingNum}/5)</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px; vertical-align: top;">Page/Screen</td><td style="padding: 8px 0; font-size: 13px;">${log.pageContext ? escHtml(log.pageContext) : "—"}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;" />
      <p style="color: #444; font-size: 13px; font-weight: 600; margin: 0 0 8px;">Description</p>
      <div style="background: #f8f8f8; border-left: 3px solid #6366f1; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap;">${escHtml(description.trim())}</div>
    </div>
    <div style="background: #f4f4f4; padding: 12px 24px; font-size: 12px; color: #888; text-align: center;">
      ICT Trading Mentor — Beta Feedback System · Log ID #${log.id}
    </div>
  </div>
</body></html>`;

    const emailText = `New Beta Feedback\n\nSubmitted: ${submittedAt}\nName: ${user.name}\nEmail: ${user.email}\nRole: ${submitterRole}\nCategory: ${category}\nRating: ${ratingNum}/5\nPage/Screen: ${log.pageContext || "—"}\n\nDescription:\n${description.trim()}`;

    await sendEmail({
      to: "support@ictmentor.com",
      subject: `[Beta Feedback] ${category} from ${user.name} — ${ratingStars}`,
      html: emailHtml,
      text: emailText,
    });

    res.status(201).json({ success: true, id: log.id });
  } catch (err) {
    console.error("Beta feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/logs", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const logs = await db
      .select({
        id: betaFeedbackLogsTable.id,
        userId: betaFeedbackLogsTable.userId,
        submitterRole: betaFeedbackLogsTable.submitterRole,
        category: betaFeedbackLogsTable.category,
        description: betaFeedbackLogsTable.description,
        rating: betaFeedbackLogsTable.rating,
        pageContext: betaFeedbackLogsTable.pageContext,
        createdAt: betaFeedbackLogsTable.createdAt,
        submitterName: usersTable.name,
        submitterEmail: usersTable.email,
      })
      .from(betaFeedbackLogsTable)
      .leftJoin(usersTable, eq(betaFeedbackLogsTable.userId, usersTable.id))
      .orderBy(desc(betaFeedbackLogsTable.createdAt));

    res.json({ logs });
  } catch (err) {
    console.error("Beta logs fetch error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
