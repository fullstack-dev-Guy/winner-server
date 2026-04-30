import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const API_KEY = process.env.VITE_FOOTBALL_API_KEY;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

// ===============================
// 🏆 PL Matches
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
// 📊 PL Standings
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
// 👥 Squad (paid, future use)
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
// ⚽ FPL Players — Premier League
// ===============================
app.get("/api/fpl-players", async (req, res) => {
  try {
    const response = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://fantasy.premierleague.com/",
        },
      },
    );
    const data = await response.json();
    const teamsMap = {};
    (data.teams || []).forEach((t) => {
      teamsMap[t.id] = t.name;
    });
    const positionMap = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
    const statusMap = {
      a: "Available",
      i: "Injured",
      d: "Doubtful",
      s: "Suspended",
      u: "Unavailable",
      n: "Not in squad",
    };
    const players = (data.elements || []).map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.second_name,
      fullName: `${p.first_name} ${p.second_name}`,
      webName: p.web_name,
      team: teamsMap[p.team] || "Unknown",
      teamId: p.team,
      position: positionMap[p.element_type] || "Unknown",
      status: statusMap[p.status] || p.status,
      news: p.news || "",
      minutesPlayed: p.minutes,
      goalsScored: p.goals_scored,
      assists: p.assists,
      cleanSheets: p.clean_sheets,
      yellowCards: p.yellow_cards,
      redCards: p.red_cards,
      saves: p.saves,
      bonusPoints: p.bonus,
      totalPoints: p.total_points,
      form: parseFloat(p.form) || 0,
      nowCost: p.now_cost / 10,
      selectedBy: parseFloat(p.selected_by_percent) || 0,
      pointsLastRound: p.event_points,
    }));
    res.json({
      fetchedAt: new Date().toISOString(),
      totalPlayers: players.length,
      teams: data.teams?.map((t) => ({ id: t.id, name: t.name })) || [],
      players,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "failed to fetch FPL players", details: err.message });
  }
});

// ===============================
// 🔍 FPL Player History
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
    res.json({ playerId: parseInt(playerId), history });
  } catch (err) {
    res
      .status(500)
      .json({ error: "failed to fetch player history", details: err.message });
  }
});

// ===============================
// 🇪🇸 LA LIGA — Matches
// ===============================
app.get("/api/laliga/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PD/matches?season=2025",
      { headers: { "X-Auth-Token": API_KEY } },
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch laliga matches" });
  }
});

// ===============================
// 🇪🇸 LA LIGA — Standings
// ===============================
app.get("/api/laliga/standings", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PD/standings?season=2025",
      { headers: { "X-Auth-Token": API_KEY } },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("API ERROR:", text);
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();

    if (!data?.standings) {
      return res.status(500).json({ error: "invalid api response" });
    }

    const total = data.standings.find((s) => s.type === "TOTAL");

    if (!total) {
      return res.status(404).json({ error: "standings not found" });
    }

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
      season: data?.season?.year ?? null,
      currentMatchday: data?.season?.currentMatchday ?? null,
      table,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch laliga standings" });
  }
});

//// ===============================
//// 🇪🇸 LA LIGA — Players (עמוד אחד)
//// ===============================
//app.get("/api/laliga/players", async (req, res) => {
//  try {
//    const page = parseInt(req.query.page) || 1;
//    const response = await fetch(
//      `https://v3.football.api-sports.io/players?league=140&season=2024&page=${page}`,
//      { headers: { "x-apisports-key": API_FOOTBALL_KEY } },
//    );
//    const data = await response.json();
//    if (!data.response)
//      return res
//        .status(500)
//        .json({ error: "API-Football error", details: data });
//    res.json({
//      fetchedAt: new Date().toISOString(),
//      page: data.paging?.current || page,
//      totalPages: data.paging?.total || 1,
//      totalPlayers: data.results || 0,
//      players: processApiFootballPlayers(data.response),
//    });
//  } catch (err) {
//    res
//      .status(500)
//      .json({ error: "failed to fetch laliga players", details: err.message });
//  }
//});
//
//// ===============================
//// 🇪🇸 LA LIGA — All Players
//// ===============================
//app.get("/api/laliga/players/all", async (req, res) => {
//  try {
//    const firstResponse = await fetch(
//      "https://v3.football.api-sports.io/players?league=140&season=2024&page=1",
//      { headers: { "x-apisports-key": API_FOOTBALL_KEY } },
//    );
//    const firstData = await firstResponse.json();
//    if (!firstData.response)
//      return res
//        .status(500)
//        .json({ error: "API-Football error", details: firstData });
//    const totalPages = firstData.paging?.total || 1;
//    let allPlayers = processApiFootballPlayers(firstData.response);
//    for (let page = 2; page <= totalPages; page++) {
//      await new Promise((resolve) => setTimeout(resolve, 250));
//      const pageResponse = await fetch(
//        `https://v3.football.api-sports.io/players?league=140&season=2024&page=${page}`,
//        { headers: { "x-apisports-key": API_FOOTBALL_KEY } },
//      );
//      const pageData = await pageResponse.json();
//      if (pageData.response)
//        allPlayers = [
//          ...allPlayers,
//          ...processApiFootballPlayers(pageData.response),
//        ];
//    }
//    res.json({
//      fetchedAt: new Date().toISOString(),
//      totalPlayers: allPlayers.length,
//      players: allPlayers,
//    });
//  } catch (err) {
//    res.status(500).json({
//      error: "failed to fetch all laliga players",
//      details: err.message,
//    });
//  }
//});

// ===============================
// 🇮🇹 SERIE A — Matches
// ===============================
app.get("/api/seriea/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/SA/matches?season=2025",
      { headers: { "X-Auth-Token": API_KEY } },
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch seriea matches" });
  }
});

// ===============================
// 🇮🇹 SERIE A — Standings
// ===============================
app.get("/api/seriea/standings", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/SA/standings?season=2025",
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
    res.status(500).json({ error: "failed to fetch seriea standings" });
  }
});

// ===============================
// 🇩🇪 BUNDESLIGA — Matches
// ===============================
app.get("/api/bundesliga/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/BL1/matches?season=2025",
      { headers: { "X-Auth-Token": API_KEY } },
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch bundesliga matches" });
  }
});

// ===============================
// 🇩🇪 BUNDESLIGA — Standings
// ===============================
app.get("/api/bundesliga/standings", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/BL1/standings?season=2025",
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
    res.status(500).json({ error: "failed to fetch bundesliga standings" });
  }
});

// ===============================
// Helper — עיבוד שחקני API-Football
// ===============================
function processApiFootballPlayers(response) {
  const positionMap = {
    Goalkeeper: "GK",
    Defender: "DEF",
    Midfielder: "MID",
    Attacker: "FWD",
  };
  return response.map((item) => {
    const p = item.player;
    const stats = item.statistics?.[0] ?? {};
    const appearances = stats.games?.appearences || 0;
    const goals = stats.goals?.total || 0;
    const assists = stats.goals?.assists || 0;
    return {
      id: p.id,
      fullName: p.name,
      webName: p.name.split(" ").pop() || p.name,
      team: stats.team?.name || "Unknown",
      teamId: stats.team?.id || 0,
      position:
        positionMap[stats.games?.position] ||
        stats.games?.position ||
        "Unknown",
      nationality: p.nationality,
      age: p.age,
      photo: p.photo,
      minutesPlayed: stats.games?.minutes || 0,
      appearances,
      goalsScored: goals,
      assists,
      yellowCards: stats.cards?.yellow || 0,
      redCards: stats.cards?.red || 0,
      saves: stats.goals?.saves || 0,
      form:
        appearances > 0
          ? parseFloat((((goals + assists) / appearances) * 10).toFixed(1))
          : 0,
      status: "Available",
      news: "",
    };
  });
}

// ===============================
// 🇫🇷 LIGUE 1 — Matches
// ===============================
app.get("/api/ligue1/matches", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/FL1/matches?season=2025",
      { headers: { "X-Auth-Token": API_KEY } },
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "failed to fetch ligue1 matches" });
  }
});

// ===============================
// 🇫🇷 LIGUE 1 — Standings
// ===============================
app.get("/api/ligue1/standings", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/FL1/standings?season=2025",
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
    res.status(500).json({ error: "failed to fetch ligue1 standings" });
  }
});

//// ===============================
//const PORT = process.env.PORT || 5000;
//app.listen(PORT, () => {
//  console.log("Server running on port " + PORT);
//});
//
//// DEBUG
//app.get("/api/debug/laliga-players", async (req, res) => {
//  try {
//    const response = await fetch(
//      "https://v3.football.api-sports.io/players?league=140&season=2024&page=1",
//      { headers: { "x-apisports-key": API_FOOTBALL_KEY } },
//    );
//    const data = await response.json();
//    res.json(data);
//  } catch (err) {
//    res.status(500).json({ error: err.message });
//  }
//});
