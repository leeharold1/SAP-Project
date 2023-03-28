const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require("path");


const app = express();
const port = 3000;

const db = new sqlite3.Database('database.sqlite3');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get("/", function(req, res) {
  res.render("index");
});

app.use(session({
  store: new SQLiteStore({ db }),
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  }
}));

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
    if (err) {
      return res.status(500).send('Error creating account.');
    }
    return res.send('Account created successfully.');
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).send('Error logging in.');
    }

    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).send('Incorrect email or password.');
    }

    req.session.userId = row.id;

    return res.send('Logged in successfully.');
  });
});

app.post('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error signing out.');
    }
    return res.send('Signed out successfully.');
  });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:3000`);
});
