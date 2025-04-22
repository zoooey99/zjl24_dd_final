const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt')
//create sequelize instance
const sequelize = new Sequelize(process.env.EXTERNAL_DATABASE_URL, {  //CHANGE to INTERNAL_... for production
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });

const User = sequelize.define('User', {
    user_id:{type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    email: {type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false},
    business_name: {type: DataTypes.STRING, allowNull: true},
    stripe_api_key: {type: DataTypes.STRING, allowNull: false},
});

User.beforeCreate(async (user) => {
    user.password = await bcrypt.hash(user.password, 10);
})

User.validPassword = async (inputPassword, hashedPassword) => {
    return bcrypt.compare(inputPassword, hashedPassword);
}

const Customer = sequelize.define('Customer', {
    customer_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,       // auto-increments
        primaryKey: true,
      },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
});
const Testimonial = sequelize.define('Testimonial', {
    testimonial_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,       // auto-increments
        primaryKey: true,
      },
    testimonial: DataTypes.STRING,
    status: DataTypes.STRING,
    stars: DataTypes.INTEGER
});

Testimonial.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'Customer'
});
User.hasMany(Customer, {
    foreignKey: 'user_id',
    as: 'Customers'
});
Customer.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User'
});
Customer.hasMany(Testimonial, {
    foreignKey: 'testimonial_id',
    as: 'Testimonials'
});

// Export everything needed
module.exports = {
    sequelize,
    User,
    Customer,
    Testimonial
};

