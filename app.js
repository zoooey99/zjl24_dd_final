require('dotenv').config({ path: '.env.local' });
const express = require('express');
const handlebars = require('express-handlebars');
const { sequelize } = require('./lib/models');  // Import sequelize from models
const handler = require('./lib/handler');
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const requireAuth = require('./middleware/auth')

const app = express();
const port = 3000;

//start auth session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    store: new SequelizeStore({ db: sequelize }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Add these middleware before your routes
app.use(express.urlencoded({ extended: true }));  // for parsing application/x-www-form-urlencoded
app.use(express.json()); 

// Set up handlebars
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Routes
app.get('/', handler.home);
app.get('/db_test', handler.db_test);
app.get('/login', handler.getLogin);
app.get('/signup', handler.getSignup);
app.post('/signup', handler.postSignup);
app.post('/login', handler.postLogin);
app.get('/logout', handler.getLogout)
app.get('/dashboard/:id?', requireAuth, handler.getDashboard);

app.get('/customers/delete/:id', handler.customersDelete)
app.get('/customers/refresh', handler.customersRefresh)
app.post('/customers/edit', handler.customersEdit)

app.post('/testimonials/create/', handler.testimonialCreate)
app.post('/testimonials/update', handler.testimonialEdit)
app.get('/testimonials/delete/:id', handler.testimonialDelete)

// Sync database and start server
sequelize.sync({force:true}) //{ alter: true }{ force: true }
    .then(() => {
        console.log('Database synced successfully');
        app.listen(port, () => {
            console.log(`Example app listening at http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });