import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const API_KEY = process.env.VITE_FOOTBALL_API_KEY;

// ===============================
// 🏆 Matches — כל משחקי העונה
// ===============================
app.get("/api/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches?season=2025",
      {
        headers: { "X-Auth-Token": API_KEY },
      },
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch matches" });
  }
});

// ===============================
// 📊 Standings — טבלת דירוג עדכנית
// ===============================
app.get("/api/standings", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PL/standings?season=2025",
      {
        headers: { "X-Auth-Token": API_KEY },
      },
    );
    const data = await response.json();

    // מחלצים רק את הטבלה הראשית (TOTAL)
    const total = data?.standings?.find((s) => s.type === "TOTAL");

    if (!total) {
      return res.status(404).json({ error: "standings not found" });
    }

    // מחזירים רשימה נקייה
    const table = total.table.map((entry) => ({
      position: entry.position,
      teamId: entry.team.id,
      teamName: entry.team.name,
      shortName: entry.team.shortName,
      tla: entry.team.tla,
      crest: entry.team.crest,
      playedGames: entry.playedGames,
      won: entry.won,
      draw: entry.draw,
      lost: entry.lost,
      points: entry.points,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
    }));

    res.json({
      season: 2025,
      currentMatchday: data?.season?.currentMatchday ?? null,
      table,
    });
  } catch (err) {
    res.status(500).json({ error: "failed to fetch standings" });
  }
});

// ===============================
// 👥 Squad — שחקני קבוצה לפי teamId
// ===============================
app.get("/api/squad/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const response = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}`,
      {
        headers: { "X-Auth-Token": API_KEY },
      },
    );
    const data = await response.json();

    const squad = (data?.squad ?? []).map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      nationality: player.nationality,
      dateOfBirth: player.dateOfBirth,
    }));

    res.json({
      teamId: data.id,
      teamName: data.name,
      squad,
    });
  } catch (err) {
    res.status(500).json({ error: "failed to fetch squad" });
  }
});

// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
