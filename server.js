const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "rtms_secret_key";
const PORT = process.env.PORT || 3000;

// =========================
// ROOT ROUTE
// =========================
app.get("/", (req, res) => {
  res.send("Backend RTMS Running ✅");
});

// =========================
// DATA USER
// =========================
const users = [
  { username: "admin", password: "1234", companies: ["ALL"] },
  { username: "itdept", password: "1234", companies: ["ALL"] },
  { username: "timo", password: "0000", companies: ["Seven Offshore Indonesia"] }
];

// =========================
// DATA COMPANY
// =========================
const companies = [
  "PT Dutaraya Tataperkasa",
  "Seven Offshore Indonesia",
  "PT Lautan Energy",
  "PT Samudra Teknik"
];

// =========================
// LOGIN
// =========================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Login gagal" });
  }

  const token = jwt.sign(
    { username: user.username, companies: user.companies },
    SECRET,
    { expiresIn: "1h" }
  );

  res.json({ message: "Login sukses", token });
});

// =========================
// GET COMPANY
// =========================
app.get("/companies", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Token tidak ditemukan" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    const allowedCompanies = decoded.companies.includes("ALL")
      ? companies
      : companies.filter(c => decoded.companies.includes(c));

    res.json({ username: decoded.username, companies: allowedCompanies });
  } catch (error) {
    res.status(401).json({ message: "Token tidak valid atau sudah expired" });
  }
});

// =========================
// START SERVER
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server jalan di port ${PORT}`);
});
// TEST LOGIN VIA BROWSER
app.get("/login-test", (req, res) => {
  res.send("Login route aktif ✅");
});