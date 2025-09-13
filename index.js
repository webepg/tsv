// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;
const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();
const bodyParser = require("body-parser");
const { url } = require("inspector");
let matches = [];
let matchUrls = [];
let doneUrls = [];
let tsvScorers = [];
let screenshot;
let isMatchDataRunning = false;
let isScorersRunning = false;
let isTsvScorersRunning = false;
let matchFile;

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json()); // für JSON-Requests

app.get("/api/matches", (req, res) => {
  res.status(200).json(matches);
});

function containsAll(arr1, arr2) {
  return arr2.every((url) => arr1.includes(url));
}

app.post("/api/matches", async (req, res) => {
  matchUrls = req.body.urls;

  async function getMatchData(urls) {
    //console.log("getMatchData urls", urls);
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

    if (matches.length == urls.length) {
      return;
    }

    while (!containsAll(doneUrls, matchUrls)) {
      let difference = matchUrls.filter((url) => !doneUrls.includes(url));
      let result = await getMatchDataForUrl(browser, difference[0]);

      if (result) {
        matches.push(result);
        console.log("doneUrl", doneUrls);
      }
    }
    isMatchDataRunning = false;

    try {
      const data = JSON.stringify(matches, null, 2);
      fs.writeFileSync(path.join(__dirname, "matches.json"), data);
    } catch (error) {
      console.error("Fehler beim Schreiben der match.json-Datei:", error);
    }

    await browser.close();
  }

  async function getMatchDataForUrl(browser, url) {
    console.log("getMatchDataForUrl url", url);
    let page;
    try {
      page = await browser.newPage();
      await page.goto(url, { timeout: 60000 });
      await page.waitForNetworkIdle();
      const cmpbntyestxt = await page.$("#cmpbntyestxt");
      if (cmpbntyestxt) {
        await cmpbntyestxt.click();
      }

      const { matchInfo } = await page.evaluate(
        () => window.REDUX_DATA.dataHistory[0].MatchPage
      );

      const match = {
        formattedDate: matchInfo.slug.split("-").pop(),
        league: matchInfo.competition.name,
        matchDay: matchInfo.round.name,
        homeTeam: matchInfo.homeTeamName,
        awayTeam: matchInfo.awayTeamName,
        homeTeamId: matchInfo.homeTeam.slug,
        awayTeamId: matchInfo.awayTeam.slug,
        homeTeamSlug: matchInfo.homeTeam.clubSlug,
        awayTeamSlug: matchInfo.awayTeam.clubSlug,
        homeTeamImg: `${matchInfo.homeTeam.image.path}200x200.jpeg`,
        awayTeamImg: `${matchInfo.awayTeam.image.path}200x200.jpeg`,
        goals: [],
        redCards: [],
        yellowRedCards: [],
        suspensions: [],
        missedPenalties: [],
      };

      matchInfo.highlights.forEach(
        ({ team, minute, additionalMinute, primaryRole, type, subtype }) => {
          const player = primaryRole
            ? `${primaryRole.firstName} ${primaryRole.lastName}`
            : "Unbekannt";
          const event = { team: team.slug, minute, additionalMinute, player };

          if (type === "goal")
            match.goals.push({ ...event, goalType: subtype });
          else if (type === "penaltyfail") match.missedPenalties.push(event);
          else if (type === "card" && subtype === "card_red")
            match.redCards.push(event);
          else if (type === "card" && subtype === "card_yellow_red")
            match.yellowRedCards.push(event);
          else if (type === "timepenalty") match.suspensions.push(event);
        }
      );

      doneUrls.push(url);
      return match;
    } catch (e) {
      console.log(e);
      return null;
    } finally {
      await page.close();
    }
  }

  if (!isMatchDataRunning) {
    isMatchDataRunning = true;
    await getMatchData(matchUrls);
  }

  res.status(200).json();
});

// Beste TSV Torschützen

async function getTsvScorers(url) {
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
    await page.goto(url, {
      timeout: 60000,
    });
    await page.waitForNetworkIdle();

    const cmpbntyestxtElement = await page.$("#cmpbntyestxt");
    if (cmpbntyestxtElement) {
      await cmpbntyestxtElement.click();
    } else {
      console.log("Element #cmpbntyestxt nicht gefunden");
    }

    // Extrahieren von Daten direkt aus dem DO    await page.click("#cmpbntyestxt");

    const teamPlayerStatsPage = await page.evaluate(() => {
      return window.REDUX_DATA["dataHistory"][0]["TeamPlayersPage"];
    });

    let players = teamPlayerStatsPage["data"]["players"];

    //console.log("players", players);

    players.forEach((player) => {
      if (player["goals"] > 0)
        tsvScorers.push({
          goals: player["goals"],
          name: player["firstName"] + " " + player["lastName"],
          img: player["image"]["path"] + "320xauto.jpeg",
          matches: player["matches"],
        });
    });
  } catch (e) {
    console.log(e);
  } finally {
    isTsvScorersRunning = false;
    await browser.close();
  }
  return [...new Set(tsvScorers)];
}

app.post("/api/scorers/tsv", async (req, res) => {
  let url = req.body.url;
  //

  if (tsvScorers.length == 0 && !isTsvScorersRunning) {
    isTsvScorersRunning = true;
    let result = await getTsvScorers(url);
    //console.log("tsvscorers", result);
  }
  res.status(200).json(tsvScorers);
});

app.get("/api/sponsors", async (req, res) => {
  const sponsorsPath = path.join(__dirname, "public", "sponsor");
  const files = fs.readdirSync(sponsorsPath);
  res.status(200).json(files);
});

app.get("/api/logos", async (req, res) => {
  const logoPath = path.join(__dirname, "public", "logo");
  const files = fs.readdirSync(logoPath);
  const filteredFiles = files.filter((file) => file.endsWith(".png"));
  //console.log("logos", filteredFiles);

  res.status(200).json(filteredFiles);
});

// Alle Torschützen
app.post("/api/scorers", async (req, res) => {
  let url = req.body.url;
  if (!screenshot && !isScorersRunning) {
    isScorersRunning = true;
    screenshot = await getScorers(url);
  } else if (screenshot) {
    res.set("Content-Type", "image/png");
    res.send(screenshot);
  } else {
    res.status(200).json();
  }
});

async function getScorers(url) {
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
    await page.goto(url, {
      timeout: 60000,
    });
    await page.waitForNetworkIdle();

    const cmpbntyestxtElement = await page.$("#cmpbntyestxt");
    if (cmpbntyestxtElement) {
      await cmpbntyestxtElement.click();
    } else {
      console.log("Element #cmpbntyestxt nicht gefunden");
    }

    screenshot = await page.screenshot({
      encoding: "binary",
      clip: { x: 0, y: 10, width: 800, height: 350 },
    });
  } catch (e) {
    console.log(e);
  } finally {
    isScorersRunning = false;
    await browser.close();
  }
  // Extrahieren von Daten direkt aus dem DOM
  return screenshot;
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  // Prüfen, ob die Datei matches.json existiert
  if (fs.existsSync(path.join(__dirname, "matches.json"))) {
    console.log("Matches.json vorhanden");
    // Datei einlesen und in matches laden
    matchFile = fs.readFileSync(path.join(__dirname, "matches.json"), "utf8");
    matches = JSON.parse(matchFile);
  }
  getTsvScorers();
  getScorers();
});
