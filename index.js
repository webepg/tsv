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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
