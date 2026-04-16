import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const API_KEY = process.env.VITE_FOOTBALL_API_KEY;

app.get("/api/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches?season=2025",
      {
        headers: {
          "X-Auth-Token": API_KEY,
        },
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch matches" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

console.log("API KEY:", process.env.FOOTBALL_API_KEY);
