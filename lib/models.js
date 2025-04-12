const { Sequelize, DataTypes } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite'
});

const User = sequelize.define('User', {
    user_id: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    stripe_api_key: DataTypes.STRING,
});
const Customer = sequelize.define('Customer', {
    customer_id: DataTypes.STRING,
    name: DataTypes.STRING,
    email: DataTypes.STRING,
});
const Testimonial = sequelize.define('Testimonial', {
    testimonial: DataTypes.STRING,
    status: DataTypes.STRING,
});

Testimonial.belongsTo(Customer);
User.hasMany(Customer);
Customer.belongsTo(User);
Customer.hasMany(Testimonial);

// Export everything needed
module.exports = {
    sequelize,
    User,
    Customer,
    Testimonial
};

