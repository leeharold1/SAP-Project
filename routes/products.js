const express = require("express");
const app = express();

app.get("/products", function(req, res) {
  res.render("products");
});