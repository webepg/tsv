// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;

/*app.get("/", (req, res) => {
  res.send("Hello World!");
});*/

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

app.post("/api/scr", (req, res) => {
  // Daten aus dem JSON-Body auswerten

  const puppeteer = require("puppeteer");

  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(
      "https://www.fupa.net/match/sv-haarbach-m1-tsv-bad-griesbach-m1-250629/info"
    );
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await page.screenshot({ path: "public/screenshot.png" });
    await browser.close();
  })();
  res.status(200).json({});
});

const puppeteer = require("puppeteer");

app.get("/api/screenshot", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://www.fupa.net/match/sv-haarbach-m1-tsv-bad-griesbach-m1-250629/info"
  );
  await page.waitForNavigation({ timeout: 60000 });
  const screenshot = await page.screenshot({ encoding: "binary" });
  res.set("Content-Type", "image/png");
  res.send(screenshot);
  await browser.close();
});

// Torschützen https://www.fupa.net/league/a-klasse-pocking/scorers

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
