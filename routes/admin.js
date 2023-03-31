const express = require("express");
const app = express();

app.get("/admin", function(req, res) {
  res.render("admin");
});