import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const ordersRouter = Router();

ordersRouter.get("/plans", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id, name, duration_days, price_paise, currency FROM plans WHERE is_active ORDER BY price_paise`);
    res.json({ data: rows, error: null });
  } catch (e) { next(e); }
});

ordersRouter.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const { planId } = req.body;
    const plan = await pool.query(`SELECT * FROM plans WHERE id = $1`, [planId]);
    if (!plan.rows[0]) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Plan not found" } });
    const p = plan.rows[0];
    const tax = Math.round((p.price_paise * p.tax_rate_bps) / 10000);
    const { rows } = await pool.query(
      `INSERT INTO orders (user_id, plan_id, amount_paise, tax_paise, currency, status, gateway, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, 'created', 'demo', $6) RETURNING *`,
      [req.user.sub, planId, p.price_paise, tax, p.currency, randomUUID()]
    );
    res.status(201).json({ data: rows[0], error: null });
  } catch (e) { next(e); }
});

/**
 * DEMO ONLY. A real integration replaces this entirely with the gateway's
 * server-to-server webhook — see api-specification.md Section 3,
 * POST /webhooks/payment. That handler verifies a cryptographic signature
 * from the gateway; this one trusts the caller, which is only acceptable
 * because it exists purely to let you test the entitlement flow without a
 * merchant account. Delete this route before going anywhere near real money.
 */
ordersRouter.post("/orders/:id/mock-pay", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`, [req.params.id, req.user.sub]);
    const order = orderRes.rows[0];
    if (!order) throw Object.assign(new Error("Order not found"), { status: 404, code: "NOT_FOUND" });
    if (order.status === "paid") {
      await client.query("ROLLBACK");
      return res.json({ data: { order, note: "Already paid — no duplicate entitlement created." }, error: null });
    }

    await client.query(`UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1`, [order.id]);

    const plan = (await client.query(`SELECT * FROM plans WHERE id = $1`, [order.plan_id])).rows[0];

    // Renewal rule from the blueprint (Section 5.1): if the user has unexpired
    // time left, extend from the current end date; otherwise start fresh now.
    const existing = (await client.query(
      `SELECT * FROM entitlements WHERE user_id = $1 AND status = 'active' AND end_at > now() ORDER BY end_at DESC LIMIT 1`,
      [req.user.sub]
    )).rows[0];

    const startAt = existing ? existing.end_at : new Date();
    const endAt = new Date(new Date(startAt).getTime() + plan.duration_days * 86400000);

    let entitlement;
    if (existing) {
      entitlement = (await client.query(
        `UPDATE entitlements SET end_at = $1, updated_at = now() WHERE id = $2 RETURNING *`,
        [endAt, existing.id]
      )).rows[0];
    } else {
      entitlement = (await client.query(
        `INSERT INTO entitlements (user_id, plan_id, source_order_id, start_at, end_at, status)
         VALUES ($1, $2, $3, now(), $4, 'active') RETURNING *`,
        [req.user.sub, order.plan_id, order.id, endAt]
      )).rows[0];
    }

    await client.query("COMMIT");
    res.json({ data: { order: { ...order, status: "paid" }, entitlement }, error: null });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.status) return res.status(e.status).json({ data: null, error: { code: e.code, message: e.message } });
    next(e);
  } finally {
    client.release();
  }
});

ordersRouter.get("/me/entitlement", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, p.name AS plan_name FROM entitlements e JOIN plans p ON p.id = e.plan_id
       WHERE e.user_id = $1 ORDER BY e.end_at DESC LIMIT 1`,
      [req.user.sub]
    );
    res.json({ data: rows[0] || null, error: null });
  } catch (e) { next(e); }
});
