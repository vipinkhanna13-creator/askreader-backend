import express from "express";
import cors from "cors";
import "dotenv/config";
import { authRouter } from "./routes/auth.js";
import { catalogueRouter } from "./routes/catalogue.js";
import { ordersRouter } from "./routes/orders.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (req, res) => res.json({ data: { ok: true }, error: null }));

app.use("/api/auth", authRouter);
app.use("/api", catalogueRouter);
app.use("/api", ordersRouter);
app.use("/api/admin", adminRouter);

// Central error handler — every route above calls next(e) on unexpected
// failures rather than leaking a stack trace to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ data: null, error: { code: "INTERNAL", message: "Something went wrong" } });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ASKreader API listening on port ${port}`));
