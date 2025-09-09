// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();
const bodyParser = require("body-parser");
let matches = [];
let tsvScorers = [];
let screenshot;

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json()); // für JSON-Requests

app.post("/api/matches", async (req, res) => {
  let urls = req.body.urls;

  async function getMatchData(urls) {
    console.log("getMatchData urls", urls);
    let browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-zygote",
      ],
    });
    const results = [];

    for (const url of urls) {
      const result = await getMatchDataForUrl(browser, url);
      results.push(result);
    }

    await browser.close();
    return results;
  }

  async function getMatchDataForUrl(browser, url) {
    let page;
    let match;

    console.log("getMatchDataForUrl url", url);

    try {
      page = await browser.newPage();
      await page.goto(url, { timeout: 90000 });
      await page.waitForNetworkIdle();

      try {
        await page.click("#cmpbntyestxt");
      } catch (e) {
        console.log(e);
      }

      const matchPage = await page.evaluate(() => {
        return window.REDUX_DATA["dataHistory"][0]["MatchPage"];
      });

      let highlights = matchPage["matchInfo"]["highlights"];

      match = {
        formattedDate: matchPage["matchInfo"]["slug"].split("-").pop(),
        league: matchPage["matchInfo"]["competition"]["name"],
        matchDay: matchPage["matchInfo"]["round"]["name"],
        homeTeam: matchPage["matchInfo"]["homeTeamName"],
        awayTeam: matchPage["matchInfo"]["awayTeamName"],
        homeTeamId: matchPage["matchInfo"]["homeTeam"]["slug"],
        awayTeamId: matchPage["matchInfo"]["awayTeam"]["slug"],
        homeTeamImg:
          matchPage["matchInfo"]["homeTeam"]["image"]["path"] + "200x200.jpeg",
        awayTeamImg:
          matchPage["matchInfo"]["awayTeam"]["image"]["path"] + "200x200.jpeg",
        goals: [],
        redCards: [],
        yellowRedCards: [],
        suspensions: [],
        missedPenalties: [],
      };

      highlights.forEach((element) => {
        const team = element.team.slug;
        const minute = element.minute;
        const additionalMinute = element.additionalMinute;
        const player = element.primaryRole
          ? `${element.primaryRole.firstName} ${element.primaryRole.lastName}`
          : "Unbekannt";

        switch (element.type) {
          case "goal":
            match.goals.push({
              team,
              minute,
              additionalMinute,
              player,
              goalType: element.subtype,
            });
            break;
          case "penaltyfail":
            match.missedPenalties.push({
              team,
              minute,
              additionalMinute,
              player,
            });
            break;
          case "card":
            if (element.subtype === "card_red") {
              match.redCards.push({ team, minute, additionalMinute, player });
            } else if (element.subtype === "card_yellow_red") {
              match.yellowRedCards.push({
                team,
                minute,
                additionalMinute,
                player,
              });
            }
            break;
          case "timepenalty":
            match.suspensions.push({ team, minute, additionalMinute, player });
            break;
        }
      });
    } catch (e) {
      console.log(e);
    } finally {
      await page.close();
    }
    return match;
  }

  if (matches.length == 0) {
    let result = await getMatchData(urls);
    matches = [...new Set(result)];
  }

  res.status(200).json(matches);
});

// Beste TSV Torschützen https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26/playerstats

async function getTsvScorers() {
  let browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
      ? process.env.PUPPETEER_EXECUTABLE_PATH
      : puppeteer.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto("https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26", {
      timeout: 90000,
    });
    await page.waitForNetworkIdle();

    try {
      await page.click("#cmpbntyestxt");
    } catch (e) {
      console.log(e);
    }

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
  } catch (e) {
    console.log(e);
  } finally {
    await browser.close();
  }
  return [...new Set(tsvScorers)];
}

app.get("/api/scorers/tsv", async (req, res) => {
  if (tsvScorers.length == 0) {
    let result = await getTsvScorers();
    console.log("tsvscorers", result);
  }
  res.status(200).json(tsvScorers);
});

app.get("/api/sponsors", async (req, res) => {
  const sponsorsPath = path.join(__dirname, "public", "sponsor");
  const files = fs.readdirSync(sponsorsPath);
  res.status(200).json(files);
});

// Alle Torschützen https://www.fupa.net/league/a-klasse-pocking/scorers
app.get("/api/scorers", async (req, res) => {
  let result;
  if (!screenshot) {
    result = await getScorers();
  } else {
    result = screenshot;
  }
  res.set("Content-Type", "image/png");
  res.send(result);
});

async function getScorers() {
  let browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
      ? process.env.PUPPETEER_EXECUTABLE_PATH
      : puppeteer.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto("https://www.fupa.net/league/a-klasse-pocking/scorers", {
      timeout: 90000,
    });
    await page.waitForNetworkIdle();

    try {
      await page.click("#cmpbntyestxt");
    } catch (e) {
      console.log(e);
    }

    screenshot = await page.screenshot({
      encoding: "binary",
      clip: { x: 0, y: 10, width: 800, height: 350 },
    });
  } catch (e) {
    console.log(e);
  } finally {
    await browser.close();
  }
  // Extrahieren von Daten direkt aus dem DOM
  return screenshot;
}

app.on("ready", () => {
  console.log("Server bereit");
  getTsvScorers();
  getScorers();
  // Hier kannst du deinen Event ausführen
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
