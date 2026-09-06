import { pool } from "../db.js";

/**
 * Returns the caller's active entitlement covering the given book, or null.
 * Mirrors API spec Section 5: checks both direct book grants and
 * category-level grants, and requires an unexpired 'active' entitlement.
 */
export async function findCoveringEntitlement(userId, bookId) {
  const { rows } = await pool.query(
    `SELECT e.*
     FROM entitlements e
     JOIN plans p ON p.id = e.plan_id
     WHERE e.user_id = $1
       AND e.status = 'active'
       AND e.end_at > now()
       AND (
         $2 = ANY(p.included_book_ids)
         OR EXISTS (
           SELECT 1 FROM book_categories bc
           WHERE bc.book_id = $2
             AND bc.category_id = ANY(p.included_category_ids)
         )
       )
     ORDER BY e.end_at DESC
     LIMIT 1`,
    [userId, bookId]
  );
  return rows[0] || null;
}

/** Express middleware: 403s with an actionable code if access isn't covered. */
export function requireEntitlement(getBookId = (req) => req.params.id) {
  return async (req, res, next) => {
    try {
      const bookId = getBookId(req);
      const entitlement = await findCoveringEntitlement(req.user.sub, bookId);
      if (!entitlement) {
        // Distinguish "never had access" from "had it and it lapsed" so the
        // client can show a renewal prompt instead of a generic error.
        const { rows } = await pool.query(
          `SELECT end_at FROM entitlements WHERE user_id = $1 ORDER BY end_at DESC LIMIT 1`,
          [req.user.sub]
        );
        const hadOne = rows[0];
        return res.status(403).json({
          data: null,
          error: {
            code: hadOne ? "ENTITLEMENT_EXPIRED" : "ENTITLEMENT_REQUIRED",
            message: hadOne
              ? `Your subscription expired on ${new Date(hadOne.end_at).toDateString()}.`
              : "No active subscription covers this title.",
          },
        });
      }
      req.entitlement = entitlement;
      next();
    } catch (e) {
      next(e);
    }
  };
}
