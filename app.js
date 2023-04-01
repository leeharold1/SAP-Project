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


//-----------------------------------------------------------------------------------------

app.get("/register", function(req, res) {
  res.render("register");
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err) => {
    if (err) {
      return res.status(500).send('Error creating account.');
    }
    res.redirect('/login');
  });
});

//------------------------------------------------------------------------------------------

app.get("/login", function(req, res) {
  res.render("login");
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error logging in.');
    }

    if (!row || row.password !== password) {
      console.log('Login failed:', email, password);
      return res.status(401).send('Incorrect password.');
    }

    req.session.userId = row.ID;

    console.log('Login successful:', email, password);
    console.log(req.session);
    res.redirect('/');
  });
});

//------------------------------------------------------------------------------------------


app.post('/logout', (req, res) => {
  console.log('Session before destroy: ', req.session);
  req.session.destroy((err) => {
    if (err) {
      console.log('Logout failed. Error signing out.');
      return res.status(500).send('Error signing out.');
    }
    console.log('Session after destroy: ', req.session);
    res.redirect('/login');
  });
});

//------------------------------------------------------------------------------------------

app.get('/admin', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error retrieving users.');
    }
    res.render('admin', { users: rows });
  });
});

app.post('/admin/:ID', async (req, res) => {
  const ID = req.params.ID;

  db.run('DELETE FROM users WHERE ID = ?', ID, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Error deleting user.');
    }
    res.redirect('/admin');
  });
});

//------------------------------------------------------------------------------------------

const products = [
  { product: 'Smartphone', price: 300.00, deliveryTime: 5 },
  { product: 'Laptop', price: 800.00, deliveryTime: 7 },
  { product: 'Tablet', price: 250.00, deliveryTime: 3 },
  { product: 'Earbuds', price: 100.00, deliveryTime: 2 },
  { product: 'Smartwatch', price: 150.00, deliveryTime: 6 },
  { product: 'Gaming console', price: 400.00, deliveryTime: 10 },
  { product: 'Wireless speaker', price: 80.00, deliveryTime: 4 },
  { product: 'Fitness tracker', price: 50.00, deliveryTime: 1 }
];

app.get('/products', (req, res) => {
  res.render('products', { products: products });
});

//------------------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`App listening at http://localhost:3000`);
});
