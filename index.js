// Basic Node.js server example
const express = require("express");
const path = require("path"); // Importiere das path Modul
const app = express();
const port = process.env.PORT || 4000;

/*app.get("/", (req, res) => {
  res.send("Hello World!");
});*/

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
