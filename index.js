// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;
const playwright = require("playwright");

app.use(express.static(path.join(__dirname, "public")));

// API-Route für Daten
app.get("/api/data", (req, res) => {
  // hier die Infos zusammenbauen
  const data = {
    title: "Meine Webseite",
    heading: "Hallo Welt!",
    message: "Willkommen auf meiner Webseite.",
  };
  res.json(data);
});

app.post("/api/match", (req, res) => {
  // Daten aus dem JSON-Body auswerten
  const matchData = req.body;

  let match = {
    formattedDate: "250808",
    homeTeam: "Heimteam",
    awayTeam: "Auswärtsteam",
    homeGoals: [{ minute: 90, additional: 2, goalscorer: "Heimtor" }],
    awayGoals: [{ minute: 105, additional: 0, goalscorer: "Auswärtstor" }],
  };

  res.status(200).json(match);
});

app.post("/api", (req, res) => {
  console.log("Request:", req.body);
  (async () => {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    await page.goto(
      "https://www.fupa.net/match/sv-haarbach-m1-tsv-bad-griesbach-m1-250629/info"
    );
    await page.waitForLoadState("networkidle");

    // Extrahieren von Daten direkt aus dem DOM
    const title = await page.title();
    const links = await page.$$eval("a", (links) =>
      links.map((link) => link.href)
    );

    console.log(title);
    console.log(links);
    result = links;
    await browser.close();
  })();
  res.status(200).json({});
});

// Alle Torschützen https://www.fupa.net/league/a-klasse-pocking/scorers

// Beste TSV Torschützen https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26/playerstats

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
