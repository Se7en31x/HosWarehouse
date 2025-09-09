require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const morgan = require("morgan");
const { readdirSync } = require("fs");
const cors = require("cors");
const { connectDB, disconnectDB } = require("./config/db");
const http = require("http");
const helmet = require("helmet");
const path = require("path");
const { initialize } = require("./initializer");
require("./cronJobs");

const server = http.createServer(app);

// 🔹 Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// 🔹 Routes
readdirSync("./Routes").map((r) =>
  app.use("/api", require("./Routes/" + r))
);

// 🔹 Socket & DB
initialize(server);
connectDB();

// 🔹 Error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("Global Error:", err.stack);
  } else {
    console.error("Global Error:", err.message);
  }
  res.status(500).json({ error: "Internal Server Error" });
});

// 🔹 Start Server
server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

// 🔹 Graceful shutdown
process.on("SIGINT", () => {
  disconnectDB().then(() => process.exit());
});
