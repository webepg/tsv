// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;
//const playwright = require("playwright");
const puppeteer = require("puppeteer");

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/matches", async (req, res) => {
  console.log("Request:", req.body);

  async function getMatchDetails() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(
      "https://www.fupa.net/match/sv-haarbach-m1-tsv-bad-griesbach-m1-250629/info"
    );
    await page.waitForNetworkIdle();

    // Extrahieren von Daten direkt aus dem DOM
    const title = await page.title();
    const links = await page.$$eval("a", (links) =>
      links.map((link) => link.href)
    );

    console.log(title);
    console.log(links);
    await browser.close();
    return links;
  }

  let result = await getMatchDetails();

  res.status(200).json(result);
});

app.post("/api/match", async (req, res) => {
  console.log("Request:", req.body);

  let match = {
    formattedDate: "250808",
    homeTeam: "Heimteam",
    awayTeam: "Auswärtsteam",
    homeGoals: [{ minute: 90, additional: 2, goalscorer: "Heimtor" }],
    awayGoals: [{ minute: 105, additional: 0, goalscorer: "Auswärtstor" }],
  };

  async function getMatchDetails() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(
      "https://www.fupa.net/match/sv-haarbach-m1-tsv-bad-griesbach-m1-250629/info"
    );
    await page.waitForNetworkIdle();
    const screenshot = await page.screenshot({ encoding: "binary" });
    // Extrahieren von Daten direkt aus dem DOM
    const title = await page.title();
    const links = await page.$$eval("a", (links) =>
      links.map((link) => link.href)
    );

    console.log(title);
    console.log(links);
    await browser.close();
    return screenshot;
  }

  let result = await getMatchDetails();
  res.set("Content-Type", "image/png");
  res.send(result);
});

// Beste TSV Torschützen https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26/playerstats

app.get("/api/scorers/tsv", async (req, res) => {
  async function getTsvScorers() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(
      "https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26/playerstats"
    );
    await page.waitForNetworkIdle();

    // Extrahieren von Daten direkt aus dem DOM
    const title = await page.title();
    const links = await page.$$eval("a", (links) =>
      links.map((link) => link.href)
    );

    console.log(title);
    console.log(links);
    await browser.close();
    return links;
  }

  let result = await getTsvScorers();
  res.status(200).json(result);
});

// Alle Torschützen https://www.fupa.net/league/a-klasse-pocking/scorers
app.get("/api/scorers", async (req, res) => {
  async function getScorers() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.fupa.net/league/a-klasse-pocking/scorers");
    await page.waitForNetworkIdle();

    // Extrahieren von Daten direkt aus dem DOM
    const title = await page.title();
    const links = await page.$$eval("a", (links) =>
      links.map((link) => link.href)
    );

    console.log(title);
    console.log(links);
    await browser.close();
    return links;
  }

  let result = await getScorers();
  res.status(200).json(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
