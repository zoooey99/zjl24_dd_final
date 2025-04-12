const express = require('express');
const handlebars = require('express-handlebars');
const { sequelize } = require('./lib/models');  // Import sequelize from models
const handler = require('./lib/handler');
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const app = express();
const port = 3001;

//start auth session
app.use(session({
  secret: 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: new SequelizeStore({ db: sequelize }),
}));

// Set up handlebars
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Routes
app.get('/', handler.home);
app.get('/db_test', handler.db_test);

// Sync database and start server
sequelize.sync({ force: true })  
    .then(() => {
        console.log('Database synced successfully');
        app.listen(port, () => {
            console.log(`Example app listening at http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });