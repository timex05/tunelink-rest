import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./config/prisma.js";

import userRoutes from "./routes/user.routes.js";
import treeRoutes from "./routes/linktree.routes.js";
import frontRoutes from "./routes/front.routes.js";
import likeRoutes from "./routes/like.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";


const app = express();

// 🧩 Middleware
app.use(helmet()); // Sicherheitsheader
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// 🔌 Datenbank prüfen
prisma.$connect()
  .then(() => console.log("✅ Connected to database"))
  .catch((err) => console.error("❌ Database connection error:", err));

// 📦 Routes
app.use("/api/user", userRoutes);
app.use("/api/tree", treeRoutes);
app.use("/api/front", frontRoutes)
app.use("/api/like", likeRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/newsletter", newsletterRoutes);

// 🔁 Health Check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API online" });
});

// ❗ Fehler-Handler (optional)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
