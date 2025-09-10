// ✅ โหลด env ให้ถูกต้อง (local vs prod)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: `.env.development` });
} else {
  // Railway / Prod ใช้ environment variables ที่ inject มา
  require("dotenv").config();
}

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

const server = http.createServer(app);

// 🔹 Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// 🔹 CORS Config
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"]; // default เฉพาะ dev

app.use(
  cors({
    origin: allowedOrigins,
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
readdirSync("./routes").map((r) =>
  app.use("/api", require("./routes/" + r))
);

// 🔹 Socket & DB
initialize(server);   // ✅ setup socket.io
connectDB();          // ✅ connect DB ก่อน

// ✅ CronJobs ต้องมา หลังจาก socket.io และ DB พร้อมแล้ว
require("./cronJobs");

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
  console.log(`🚀 Server running at http://localhost:${port} in ${process.env.NODE_ENV} mode`);
});

// 🔹 Graceful shutdown
process.on("SIGINT", () => {
  disconnectDB().then(() => process.exit());
});
