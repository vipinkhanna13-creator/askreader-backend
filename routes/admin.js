import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("content_admin", "subscription_admin", "super_admin"));

async function logAudit(client, actorId, action, targetTable, targetId, before, after) {
  await client.query(
    `INSERT INTO audit_events (actor_id, action, target_table, target_id, before_value, after_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorId, action, targetTable, targetId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]
  );
}

adminRouter.get("/books", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, array_agg(DISTINCT bc.category_id) AS category_ids,
              (SELECT status FROM editions ed WHERE ed.book_id = b.id ORDER BY ed.created_at DESC LIMIT 1) AS latest_status
       FROM books b LEFT JOIN book_categories bc ON bc.book_id = b.id
       GROUP BY b.id ORDER BY b.title`
    );
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});

adminRouter.post("/books", requireRole("content_admin", "super_admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { title, author_editor, state, subject, categoryIds = [] } = req.body;
    const { rows } = await client.query(
      `INSERT INTO books (title, author_editor, state, subject) VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, author_editor, state, subject]
    );
    const book = rows[0];
    for (const catId of categoryIds) {
      await client.query(`INSERT INTO book_categories (book_id, category_id) VALUES ($1, $2)`, [book.id, catId]);
    }
    await logAudit(client, req.user.sub, "book.created", "books", book.id, null, book);
    await client.query("COMMIT");
    res.status(201).json({ data: book, error: null });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
});

adminRouter.patch("/editions/:id/status", requireRole("content_admin", "super_admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { status } = req.body;
    const before = (await client.query(`SELECT * FROM editions WHERE id = $1`, [req.params.id])).rows[0];
    if (!before) throw Object.assign(new Error("Edition not found"), { status: 404 });

    // Publishing an edition supersedes any previously-published edition of
    // the same book — Section 8.2: corrections never silently overwrite.
    if (status === "published") {
      await client.query(
        `UPDATE editions SET status = 'superseded', superseded_by = $1
         WHERE book_id = $2 AND status = 'published' AND id <> $1`,
        [req.params.id, before.book_id]
      );
    }

    const after = (await client.query(
      `UPDATE editions SET status = $1, published_at = CASE WHEN $1 = 'published' THEN now() ELSE published_at END,
       updated_at = now() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    )).rows[0];

    await logAudit(client, req.user.sub, `edition.status.${status}`, "editions", after.id, before, after);
    await client.query("COMMIT");
    res.json({ data: after, error: null });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.status) return res.status(e.status).json({ data: null, error: { code: "NOT_FOUND", message: e.message } });
    next(e);
  } finally {
    client.release();
  }
});

adminRouter.get("/subscribers", requireRole("subscription_admin", "super_admin"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, e.status, e.start_at, e.end_at, p.name AS plan_name,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (e.end_at - now())) / 86400))::int AS days_left
       FROM users u
       LEFT JOIN LATERAL (
         SELECT * FROM entitlements WHERE user_id = u.id ORDER BY end_at DESC LIMIT 1
       ) e ON true
       LEFT JOIN plans p ON p.id = e.plan_id
       WHERE u.role IN ('individual_subscriber', 'institutional_subscriber')
       ORDER BY e.end_at NULLS LAST`
    );
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});

adminRouter.post("/subscribers/:userId/entitlement/extend", requireRole("subscription_admin", "super_admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = (await client.query(
      `SELECT * FROM entitlements WHERE user_id = $1 ORDER BY end_at DESC LIMIT 1`,
      [req.params.userId]
    )).rows[0];
    if (!before) throw Object.assign(new Error("No entitlement to extend"), { status: 404 });

    const base = before.end_at > new Date() ? before.end_at : new Date();
    const newEnd = new Date(new Date(base).getTime() + 365 * 86400000);
    const after = (await client.query(
      `UPDATE entitlements SET end_at = $1, status = 'active', updated_at = now() WHERE id = $2 RETURNING *`,
      [newEnd, before.id]
    )).rows[0];

    await logAudit(client, req.user.sub, "entitlement.extended", "entitlements", after.id, before, after);
    await client.query("COMMIT");
    res.json({ data: after, error: null });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.status) return res.status(e.status).json({ data: null, error: { code: "NOT_FOUND", message: e.message } });
    next(e);
  } finally {
    client.release();
  }
});

adminRouter.get("/audit", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.name AS actor_name FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 100`
    );
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});
