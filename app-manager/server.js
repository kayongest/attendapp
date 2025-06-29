require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later",
});

app.use("/api/", apiLimiter);
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// In-memory database (replace with real database in production)
let users = [
  {
    id: uuidv4(),
    username: "admin",
    password: bcrypt.hashSync("admin123", 12),
    role: "admin",
    createdAt: new Date().toISOString(),
  },
];

let keys = [];

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-strong-secret-key-here";
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || "1h";

// Enhanced Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const userExists = users.some((u) => u.username === decoded.username);
    if (!userExists) {
      return res.status(403).json({ error: "User no longer exists" });
    }

    req.user = decoded;
    next();
  });
};

// Admin Check Middleware
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden: Admin privileges required",
      userRole: req.user.role,
    });
  }

  next();
};

// Routes

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      username: user.username,
      role: user.role,
      userId: user.id,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.json({
    token,
    username: user.username,
    role: user.role,
    userId: user.id,
  });
});

// Key Management
app.get("/api/keys", authenticateJWT, (req, res) => {
  if (req.user.role === "admin") {
    return res.json(keys);
  }

  // For regular users, only show current assignments
  const now = new Date();
  const filteredKeys = keys.filter((key) => {
    const start = new Date(key.startDate);
    const end = new Date(key.endDate);
    return start <= now && end >= now;
  });

  res.json(filteredKeys);
});

app.post("/api/keys", authenticateJWT, (req, res) => {
  const { event, room, device, vMixKey, user, startDate, endDate } = req.body;

  // Basic validation
  if (
    !event ||
    !room ||
    !device ||
    !vMixKey ||
    !user ||
    !startDate ||
    !endDate
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: "End date must be after start date" });
  }

  const newKey = {
    id: uuidv4(),
    ...req.body,
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: req.user.username,
  };

  keys.push(newKey);
  res.status(201).json(newKey);
});

app.put("/api/keys/:id", authenticateJWT, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can edit keys" });
  }

  const keyId = req.params.id;
  const keyIndex = keys.findIndex((k) => k.id === keyId);

  if (keyIndex === -1) {
    return res.status(404).json({ error: "Key not found" });
  }

  // Validate dates if being updated
  if (req.body.startDate && req.body.endDate) {
    if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
      return res
        .status(400)
        .json({ error: "End date must be after start date" });
    }
  }

  keys[keyIndex] = { ...keys[keyIndex], ...req.body };
  res.json(keys[keyIndex]);
});

app.delete("/api/keys/:id", authenticateJWT, isAdmin, (req, res) => {
  const keyId = req.params.id;
  keys = keys.filter((k) => k.id !== keyId);
  res.sendStatus(204);
});

// User Management (Admin only)
app.get("/api/users", authenticateJWT, isAdmin, (req, res) => {
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  res.json(usersWithoutPasswords);
});

app.post("/api/users", authenticateJWT, isAdmin, (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ error: "Username, password and role are required" });
  }

  if (users.some((u) => u.username === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }

  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified" });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password: bcrypt.hashSync(password, 12),
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  const { password: _, ...userData } = newUser;
  res.status(201).json(userData);
});

app.post("/api/users/reset-password", authenticateJWT, isAdmin, (req, res) => {
  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    return res
      .status(400)
      .json({ error: "Username and new password are required" });
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Prevent admin from locking themselves out
  if (user.username === req.user.username) {
    return res.status(400).json({
      error: "Admins cannot reset their own password via this endpoint",
    });
  }

  user.password = bcrypt.hashSync(newPassword, 12);
  res.sendStatus(200);
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin user created: username "admin", password "admin123"`);
});
