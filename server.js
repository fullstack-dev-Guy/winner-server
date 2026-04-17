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
      { headers: { "X-Auth-Token": API_KEY } },
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
      { headers: { "X-Auth-Token": API_KEY } },
    );
    const data = await response.json();

    const total = data?.standings?.find((s) => s.type === "TOTAL");
    if (!total) return res.status(404).json({ error: "standings not found" });

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
// (football-data.org — בתשלום, שמור לעתיד)
// ===============================
app.get("/api/squad/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const response = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}`,
      { headers: { "X-Auth-Token": API_KEY } },
    );
    const data = await response.json();

    const squad = (data?.squad ?? []).map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      nationality: player.nationality,
      dateOfBirth: player.dateOfBirth,
    }));

    res.json({ teamId: data.id, teamName: data.name, squad });
  } catch (err) {
    res.status(500).json({ error: "failed to fetch squad" });
  }
});

// ===============================
// ⚽ FPL Players — כל שחקני הפרמיר ליג
// Fantasy Premier League API — חינמי, ללא מפתח
// מחזיר: שחקנים + קבוצות + סטטיסטיקות עדכניות
// ===============================
app.get("/api/fpl-players", async (req, res) => {
  try {
    const response = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      {
        headers: {
          // User-Agent נדרש כדי ש-FPL לא יחסום את הבקשה
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://fantasy.premierleague.com/",
        },
      },
    );

    if (!res.ok && response.status !== 200) {
      return res
        .status(response.status)
        .json({ error: "FPL API error", status: response.status });
    }

    const data = await response.json();

    // בנה מפה של קבוצות: id → שם
    const teamsMap = {};
    (data.teams || []).forEach((t) => {
      teamsMap[t.id] = t.name;
    });

    // מיפוי פוזיציות
    const positionMap = {
      1: "GK",
      2: "DEF",
      3: "MID",
      4: "FWD",
    };

    // מיפוי סטטוס
    const statusMap = {
      a: "Available",
      i: "Injured",
      d: "Doubtful",
      s: "Suspended",
      u: "Unavailable",
      n: "Not in squad",
    };

    // נקה ועבד את נתוני השחקנים
    const players = (data.elements || []).map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.second_name,
      fullName: `${p.first_name} ${p.second_name}`,
      webName: p.web_name, // שם מקוצר (למשל "Salah")
      team: teamsMap[p.team] || "Unknown",
      teamId: p.team,
      position: positionMap[p.element_type] || "Unknown",
      status: statusMap[p.status] || p.status,
      news: p.news || "", // פרטי פציעה/השעיה
      // סטטיסטיקות עונה
      minutesPlayed: p.minutes,
      goalsScored: p.goals_scored,
      assists: p.assists,
      cleanSheets: p.clean_sheets,
      yellowCards: p.yellow_cards,
      redCards: p.red_cards,
      saves: p.saves,
      bonusPoints: p.bonus,
      totalPoints: p.total_points,
      // כושר ומחיר
      form: parseFloat(p.form) || 0, // ממוצע נקודות 5 מחזורים
      nowCost: p.now_cost / 10, // מחיר ב-מיליוני £
      selectedBy: parseFloat(p.selected_by_percent) || 0, // % בחרו בו
      // מחזור אחרון
      pointsLastRound: p.event_points,
    }));

    res.json({
      fetchedAt: new Date().toISOString(),
      totalPlayers: players.length,
      teams: data.teams?.map((t) => ({ id: t.id, name: t.name })) || [],
      players,
    });
  } catch (err) {
    console.error("FPL fetch error:", err.message);
    res
      .status(500)
      .json({ error: "failed to fetch FPL players", details: err.message });
  }
});

// ===============================
// 🔍 FPL Player History — היסטוריה של שחקן ספציפי לפי מחזורים
// ===============================
app.get("/api/fpl-player/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const response = await fetch(
      `https://fantasy.premierleague.com/api/element-summary/${playerId}/`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          Referer: "https://fantasy.premierleague.com/",
        },
      },
    );

    const data = await response.json();

    // היסטוריה לפי מחזורים (העונה הנוכחית)
    const history = (data.history || []).map((h) => ({
      gameweek: h.round,
      opponent: h.opponent_team,
      wasHome: h.was_home,
      minutes: h.minutes,
      goalsScored: h.goals_scored,
      assists: h.assists,
      cleanSheet: h.clean_sheets,
      yellowCards: h.yellow_cards,
      redCards: h.red_cards,
      saves: h.saves,
      bonus: h.bonus,
      totalPoints: h.total_points,
    }));

    res.json({
      playerId: parseInt(playerId),
      history,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "failed to fetch player history", details: err.message });
  }
});

// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
