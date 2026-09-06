import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ data: null, error: { code: "UNAUTHENTICATED", message: "Missing Authorization header" } });
  }
  const token = header.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ data: null, error: { code: "UNAUTHENTICATED", message: "Invalid or expired token" } });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "Insufficient role for this action" } });
    }
    next();
  };
}
