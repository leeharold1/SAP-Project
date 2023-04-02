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
    secure: false,
    httpOnly: true,
    sameSite: 'strict'
  }
}));


//-----------------------------------------------------------------------------------------

app.get("/register", function(req, res) {
  res.render("register");
});

const passwordRegex = /^(?=.*\d) (?=.*[a-z]) (?=.*[A-Z]) (?=.*[!@#$%^&*()_+]) (?=.*[a-zA-Z]).{8,}$/; 
// ^^ Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character ^^



app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!passwordRegex.test(password)) {
    // Log the failed registration attempt to the LogTable table
    const activity = 'User registration failed due to weak password';
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
      if (err) {
        console.log('Error logging activity to LogTable:', err);
      }
    });
    return res.status(400).send('Password does not meet minimum requirements.');
  }

  try {
    const saltRounds = 10; //rounds of salt used for hash
    const hashedPassword = await bcrypt.hash(password, saltRounds); //hashedPassword = Password after 10 rounds of salt

    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err) => {
      if (err) {
        // Log the failed registration attempt to the LogTable table
        const activity = 'User registration failed';
        const timestamp = new Date().toISOString();
        db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
          if (err) {
            console.log('Error logging activity to LogTable:', err);
          }
        });
        return res.status(500).send('Error creating account.');
      }

      // Log the successful registration to the LogTable table
      const activity = 'User registered';
      const timestamp = new Date().toISOString();
      db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
        if (err) {
          console.log('Error logging activity to LogTable:', err);
        }
      });

      res.redirect('/login');
    });
  } catch (err) {
    // Log the failed registration attempt to the LogTable table
    const activity = 'User registration failed';
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
      if (err) {
        console.log('Error logging activity to LogTable:', err);
      }
    });
    return res.status(500).send('Error creating account.');
  }
});




//------------------------------------------------------------------------------------------

app.get("/login", function(req, res) {
  res.render("login");
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      // Log the failed login attempt to the LogTable table
      const activity = 'Login failed';
      const timestamp = new Date().toISOString();
      db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
        if (err) {
          console.log('Error logging activity to LogTable:', err);
        }
      });
      console.log(err);
      return res.status(500).send('Error logging in.');
    }

    if (!row || row.password !== password) {
      // Log the failed login attempt to the LogTable table
      const activity = 'Login failed';
      const timestamp = new Date().toISOString();
      db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
        if (err) {
          console.log('Error logging activity to LogTable:', err);
        }
      });
      console.log('Login failed:', email);
      return res.status(401).send('Incorrect login credentials.');
    }

    // Log the successful login to the LogTable table
    const activity = 'Login successful';
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
      if (err) {
        console.log('Error logging activity to LogTable:', err);
      }
    });

    req.session.userId = row.ID;

    console.log('Login successful:', email);
    console.log(req.session);
    console.log(req.session.userId);
    res.redirect('/');
  });
});

//------------------------------------------------------------------------------------------


app.post('/logout', (req, res) => {
  console.log('Session before destroy: ', req.session);

  if (typeof req.session.userId === 'undefined') {
    // User is not logged in, return error message and log the activity
    const activity = 'Logout failed: user not logged in';
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
      if (err) {
        console.log('Error logging activity to LogTable:', err);
      }
    });
    return res.status(401).send('You are not logged in.');
  }

  req.session.destroy((err) => {
    if (err) {
      // unsuccessful logout and log the activity
      const activity = 'Logout unsuccessful';
      const timestamp = new Date().toISOString();
      db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
        if (err) {
          console.log('Error logging activity to LogTable:', err);
        }
      });
      console.log('Logout failed. Error signing out.');
      return res.status(500).send('Error signing out.');
    }

    // successful logout and log the activity
    const activity = 'Logout successful';
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
      if (err) {
        console.log('Error logging activity to LogTable:', err);
      }
    });

    console.log('Session after destroy: ', req.session);
    res.redirect('/login');
  });
});




//------------------------------------------------------------------------------------------

app.get('/admin', (req, res) => {
  const userId = req.session.userId;
  if (userId !== 0) { // if userId does not equal 0, user is not authorised
    return res.status(401).send('You are not authorised to view this page.');
  }
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
      // Log the failed user deletion attempt to the LogTable table
      const activity = 'User deletion failed';
      const timestamp = new Date().toISOString();
      db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
        if (err) {
          console.log('Error logging activity to LogTable:', err);
        }
      });
      return res.status(500).send('Error deleting user.');
    }

    // Log the successful user deletion to the LogTable table
    const activity = 'User deleted';
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO LogTable (activity_Logged, logged_At) VALUES (?, ?)', [activity, timestamp], (err) => {
      if (err) {
        console.log('Error logging activity to LogTable:', err);
      }
    });

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
  const userId = req.session.userId;
  console.log(userId)
  if (userId !== undefined && userId !== 0) {       // if the userId is undefined (not logged in), or 0 (admin)
    res.render('products', { products: products }); // the page cannot be viewed
  } else {
    res.status(401).send('Please log in to view this page.');
  }
});


//------------------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`App listening at http://localhost:3000`);
});
