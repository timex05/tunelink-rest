const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { prisma } = require("./utils/prisma");

const userRoutes = require("./routes/user.routes");
const treeRoutes = require("./routes/linktree.routes");
const frontRoutes = require("./routes/front.routes");
const likeRoutes = require("./routes/like.routes");
const commentRoutes = require("./routes/comment.routes");
const newsletterRoutes = require("./routes/newsletter.routes");
const spotifyRoutes = require("./routes/spotify.routes");


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
app.use("/api/spotify", spotifyRoutes);


// 🔁 Health Check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API online" });
});

// ❗ Fehler-Handler (optional)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
