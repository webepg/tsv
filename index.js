// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
let matches = [];
let tsvScorers = [];

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json()); // für JSON-Requests

app.post("/api/matches", async (req, res) => {
  let urls = req.body.urls;

  async function getMatchData(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    url = url + "/info";
    await page.goto(url);
    await page.waitForNetworkIdle();

    await page.click("#cmpbntyestxt");

    const matchPage = await page.evaluate(() => {
      return window.REDUX_DATA["dataHistory"][0]["MatchPage"];
    });

    let highlights = matchPage["matchInfo"]["highlights"];

    let match = {
      formattedDate: matchPage["matchInfo"]["slug"].split("-").pop(),
      league: matchPage["matchInfo"]["competition"]["name"],
      matchDay: matchPage["matchInfo"]["round"]["name"],
      homeTeam: matchPage["matchInfo"]["homeTeamName"],
      awayTeam: matchPage["matchInfo"]["awayTeamName"],
      goals: [],
      redCards: [],
      yellowRedCards: [],
      suspensions: [],
      missedPenalties: [],
    };

    highlights.forEach((element) => {
      if (element["type"] == "goal") {
        match.goals.push({
          team: element["team"]["slug"],
          minute: element["minute"],
          additionalMinute: element["additionalMinute"],
          player: element["primaryRole"]
            ? element["primaryRole"]["firstName"] +
              " " +
              element["primaryRole"]["lastName"]
            : "Unbekannt",
        });
      }

      if (element["type"] == "penaltyfail") {
        match.missedPenalties.push({
          team: element["team"]["slug"],
          minute: element["minute"],
          additionalMinute: element["additionalMinute"],
          player: element["primaryRole"]
            ? element["primaryRole"]["firstName"] +
              " " +
              element["primaryRole"]["lastName"]
            : "Unbekannt",
        });
      }

      if (element["type"] == "card" && element["subtype"] == "card_red") {
        match.redCards.push({
          team: element["team"]["slug"],
          minute: element["minute"],
          additionalMinute: element["additionalMinute"],
          player: element["primaryRole"]
            ? element["primaryRole"]["firstName"] +
              " " +
              element["primaryRole"]["lastName"]
            : "Unbekannt",
        });

        if (
          element["type"] == "card" &&
          element["subtype"] == "card_yellow_red"
        ) {
          match.yellowRedCards.push({
            team: element["team"]["slug"],
            minute: element["minute"],
            additionalMinute: element["additionalMinute"],
            player: element["primaryRole"]
              ? element["primaryRole"]["firstName"] +
                " " +
                element["primaryRole"]["lastName"]
              : "Unbekannt",
          });

          if (element["type"] == "timepenalty") {
            match.suspensions.push({
              team: element["team"]["slug"],
              minute: element["minute"],
              additionalMinute: element["additionalMinute"],
              player: element["primaryRole"]
                ? element["primaryRole"]["firstName"] +
                  " " +
                  element["primaryRole"]["lastName"]
                : "Unbekannt",
            });
          }
        }
      }
    });

    await browser.close();
    return match;
  }

  if (matches.length == 0) {
    urls.forEach(async (url) => {
      let result = await getMatchData(url);
      matches.push(result);
      matches = [...new Set(matches)];
    });
  }

  res.status(200).json(matches);
});

// Beste TSV Torschützen https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26/playerstats

app.get("/api/scorers/tsv", async (req, res) => {
  async function getTsvScorers() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26");
    await page.waitForNetworkIdle();

    await page.click("#cmpbntyestxt");

    // Extrahieren von Daten direkt aus dem DO    await page.click("#cmpbntyestxt");

    const teamPlayerStatsPage = await page.evaluate(() => {
      return window.REDUX_DATA["dataHistory"][0]["TeamPlayersPage"];
    });

    let players = teamPlayerStatsPage["data"]["players"];

    players.forEach((player) => {
      if (player["goals"] > 0)
        tsvScorers.push({
          goals: player["goals"],
          name: player["firstName"] + " " + player["lastName"],
          img: player["image"]["path"] + "320xauto.jpeg",
        });
    });

    await browser.close();
    return [...new Set(tsvScorers)];
  }

  if (tsvScorers.length == 0) {
    let result = await getTsvScorers();
    console.log("tsvscorers", result);
  }
  res.status(200).json(tsvScorers);
});

app.get("/api/sponsors", async (req, res) => {
  const fs = require("fs");
  const sponsorsPath = path.join(__dirname, "public", "sponsor");
  const files = fs.readdirSync(sponsorsPath);
  res.status(200).json(files);
});

// Alle Torschützen https://www.fupa.net/league/a-klasse-pocking/scorers
app.get("/api/scorers", async (req, res) => {
  async function getScorers() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.fupa.net/league/a-klasse-pocking/scorers");
    await page.waitForNetworkIdle();

    await page.click("#cmpbntyestxt");

    let screenshot = await page.screenshot({
      encoding: "binary",
      clip: { x: 0, y: 30, width: 800, height: 340 },
    });

    // Extrahieren von Daten direkt aus dem DOM
    await browser.close();
    return screenshot;
  }

  let result = await getScorers();
  res.set("Content-Type", "image/png");
  res.send(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
