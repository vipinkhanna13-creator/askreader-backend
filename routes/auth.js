import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

// NOTE: the full blueprint (Section 6.1) calls for OTP verification by
// email/SMS. This scaffold uses plain email+password so the whole stack
// runs with zero external services — wire in a real OTP provider (e.g. via
// the notifications table + an SMS/email API) before handling real users.

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ data: null, error: { code: "VALIDATION", message: "name, email, and password are required" } });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, $3, 'individual_subscriber', 'active', now())
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );
    const user = rows[0];
    res.status(201).json({ data: { user, token: signToken(user) }, error: null });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ data: null, error: { code: "EMAIL_TAKEN", message: "An account with this email already exists" } });
    }
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ data: null, error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    }
    res.json({ data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: signToken(user) }, error: null });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id, name, email, role, state, created_at FROM users WHERE id = $1`, [req.user.sub]);
    res.json({ data: rows[0] || null, error: null });
  } catch (e) {
    next(e);
  }
});
