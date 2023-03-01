const express = require("express");
const app = express();
const port = 3000;

// ADD THIS
var cors = require("cors");
app.use(cors());
app.get("/", (req, res) => {
  res.header("Access-Control-Allow-Origin");

  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
