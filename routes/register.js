const express = require("express");
const app = express();

app.get("/register", function(req, res) {
  res.render("register");
});
