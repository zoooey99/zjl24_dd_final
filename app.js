
const express = require('express');
const handlebars = require('express-handlebars');

const app = express();
const port = 3001

//set up handlebars stuff
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

//import our models and init database
const { User, Customer, Testimonial} = require('./lib/models')
const {Sequelize, Model, DataTypes } = require('sequelize')

//create sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
})



app.get('/', (req, res) => {
  res.render('home')
})


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


// Sync database
sequelize.sync()
  .then(() => {
    console.log('Database synced successfully');
    app.listen(3000);
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });