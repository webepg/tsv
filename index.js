// Basic Node.js server example
const express = require("express");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

let matches = [];
let matchUrls = [];
const doneUrls = new Set();
let tsvScorers = [];
let screenshotBuffer = null;
let isMatchDataRunning = false;
let isScorersRunning = false;
let isTsvScorersRunning = false;

const puppeteerConfig = {
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
};

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/matches", (req, res) => {
  res.status(200).json(matches);
});

function containsAll(arr1, arr2) {
  return arr2.every((url) => arr1.includes(url));
}

async function withBrowser(fn) {
  const browser = await puppeteer.launch(puppeteerConfig);
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function clickConsentIfPresent(page) {
  const consentButton = await page.$("#cmpbntyestxt");
  if (consentButton) await consentButton.click();
}

async function getMatchDataForUrl(browser, url) {
  console.log("getMatchDataForUrl url", url);
  let page;
  try {
    page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });
    await page.waitForNetworkIdle();
    await clickConsentIfPresent(page);

    const { matchInfo } = await page.evaluate(
      () => window.REDUX_DATA.dataHistory[0].MatchPage,
    );

    const match = {
      url,
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
      verdict: matchInfo.verdict || "",
    };

    matchInfo.highlights.forEach(
      ({ team, minute, additionalMinute, primaryRole, type, subtype }) => {
        const player = primaryRole
          ? `${primaryRole.firstName} ${primaryRole.lastName}`
          : "Unbekannt";
        const event = { team: team.slug, minute, additionalMinute, player };

        if (type === "goal") match.goals.push({ ...event, goalType: subtype });
        else if (type === "penaltyfail") match.missedPenalties.push(event);
        else if (type === "card" && subtype === "card_red")
          match.redCards.push(event);
        else if (type === "card" && subtype === "card_yellow_red")
          match.yellowRedCards.push(event);
        else if (type === "timepenalty") match.suspensions.push(event);
      },
    );

    doneUrls.add(url);
    return match;
  } catch (e) {
    console.log(e);
    return null;
  } finally {
    if (page) await page.close();
  }
}

async function getMatchData(urls) {
  if (matches.length === urls.length) return;

  matches.forEach((match) => doneUrls.add(match.url));

  await withBrowser(async (browser) => {
    while (!containsAll(Array.from(doneUrls), urls)) {
      const remaining = urls.filter((url) => !doneUrls.has(url));
      const result = await getMatchDataForUrl(browser, remaining[0]);
      if (result) {
        matches.push(result);
        console.log("doneUrl", Array.from(doneUrls));
      } else {
        // If a request failed, wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  });

  isMatchDataRunning = false;
}

app.post("/api/matches", async (req, res) => {
  matchUrls = req.body.urls || [];

  if (!isMatchDataRunning) {
    isMatchDataRunning = true;
    await getMatchData(matchUrls);
  }

  res.sendStatus(200);
});

async function getTsvScorers(url) {
  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });
    await page.waitForNetworkIdle();
    await clickConsentIfPresent(page);

    const teamPlayerStatsPage = await page.evaluate(
      () => window.REDUX_DATA["dataHistory"][0]["TeamPlayersPage"],
    );

    const players = teamPlayerStatsPage.data.players;
    const scorers = players
      .filter((player) => player.goals > 0)
      .map((player) => ({
        goals: player.goals,
        name: `${player.firstName} ${player.lastName}`,
        img: `${player.image.path}320xauto.jpeg`,
        matches: player.matches,
      }));

    return [...new Map(scorers.map((s) => [s.name, s])).values()];
  });
}

app.post("/api/scorers/tsv", async (req, res) => {
  const url = req.body.url;

  if (tsvScorers.length === 0 && !isTsvScorersRunning) {
    isTsvScorersRunning = true;
    tsvScorers = await getTsvScorers(url);
    isTsvScorersRunning = false;
  }

  res.status(200).json(tsvScorers);
});

app.get("/api/sponsors", (req, res) => {
  const sponsorsPath = path.join(__dirname, "public", "sponsor");
  const files = fs.readdirSync(sponsorsPath);
  res.status(200).json(files);
});

app.get("/api/logos", (req, res) => {
  const logoPath = path.join(__dirname, "public", "logo");
  const files = fs.readdirSync(logoPath);
  const filteredFiles = files.filter((file) => file.endsWith(".png"));
  res.status(200).json(filteredFiles);
});

app.post("/api/scorers", async (req, res) => {
  const url = req.body.url;

  if (!screenshotBuffer && !isScorersRunning) {
    isScorersRunning = true;
    screenshotBuffer = await getScorers(url);
    isScorersRunning = false;
  }

  if (screenshotBuffer) {
    res.set("Content-Type", "image/png");
    res.send(screenshotBuffer);
  } else {
    res.sendStatus(204);
  }
});

async function getScorers(url) {
  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });
    await page.waitForNetworkIdle();
    await clickConsentIfPresent(page);

    return page.screenshot({
      encoding: "binary",
      clip: { x: 0, y: 10, width: 800, height: 350 },
    });
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);

  const matchesPath = path.join(__dirname, "matches.json");
  if (fs.existsSync(matchesPath)) {
    console.log("Matches.json vorhanden");
    const matchFile = fs.readFileSync(matchesPath, "utf8");
    matches = JSON.parse(matchFile).filter((match) => match.url !== undefined);
    matches.forEach((match) => doneUrls.add(match.url));
    console.log("eingelesene matches", matches);
  }

  getScorers("https://www.fupa.net/league/a-klasse-pocking/scorers");
});
