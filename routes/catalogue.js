import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";

export const catalogueRouter = Router();

catalogueRouter.get("/categories", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.slug,
              (SELECT count(*) FROM book_categories bc WHERE bc.category_id = c.id) AS book_count
       FROM categories c WHERE c.is_active ORDER BY c.display_order`
    );
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});

catalogueRouter.get("/categories/:id/books", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.title, b.author_editor, b.state, b.subject,
              e.id AS edition_id, e.version_label, e.amendment_currency, e.status
       FROM books b
       JOIN book_categories bc ON bc.book_id = b.id
       LEFT JOIN LATERAL (
         SELECT * FROM editions ed WHERE ed.book_id = b.id AND ed.status = 'published'
         ORDER BY ed.published_at DESC LIMIT 1
       ) e ON true
       WHERE bc.category_id = $1
       ORDER BY b.title`,
      [req.params.id]
    );
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});

catalogueRouter.get("/books/:id", async (req, res, next) => {
  try {
    const book = await pool.query(`SELECT * FROM books WHERE id = $1`, [req.params.id]);
    if (!book.rows[0]) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Book not found" } });
    const editions = await pool.query(
      `SELECT id, version_label, status, effective_date, amendment_currency
       FROM editions WHERE book_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ data: { ...book.rows[0], editions: editions.rows }, error: null });
  } catch (e) { next(e); }
});

// Entitlement-gated: this is the enforcement point described in the API
// spec Section 5 and the architecture doc's request-flow diagram.
catalogueRouter.get(
  "/books/:id/editions/:editionId/sections",
  requireAuth,
  requireEntitlement((req) => req.params.id),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, parent_id, title, sort_order, content
         FROM edition_sections WHERE edition_id = $1 ORDER BY sort_order`,
        [req.params.editionId]
      );
      res.json({ data: rows, error: null });
    } catch (e) { next(e); }
  }
);

catalogueRouter.get("/search", requireAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ data: [], error: null });
    // Filters to entitled content BEFORE matching, per API spec Section 2 —
    // never reveal that a match exists in content the caller can't read.
    const { rows } = await pool.query(
      `SELECT es.id AS section_id, es.title, es.content, b.id AS book_id, b.title AS book_title
       FROM edition_sections es
       JOIN editions ed ON ed.id = es.edition_id AND ed.status = 'published'
       JOIN books b ON b.id = ed.book_id
       JOIN book_categories bc ON bc.book_id = b.id
       JOIN entitlements e ON e.status = 'active' AND e.end_at > now() AND e.user_id = $2
       JOIN plans p ON p.id = e.plan_id AND (b.id = ANY(p.included_book_ids) OR bc.category_id = ANY(p.included_category_ids))
       WHERE to_tsvector('english', coalesce(es.search_text, es.content, '')) @@ plainto_tsquery('english', $1)
       LIMIT 20`,
      [q, req.user.sub]
    );
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});
