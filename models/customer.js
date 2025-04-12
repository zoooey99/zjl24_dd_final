module.exports = (sequelize, DataTypes) => {
    const Customer = sequelize.define('Customer', {
        customer_id: DataTypes.STRING,
        name: DataTypes.STRING,
        email: DataTypes.STRING,
    });

    Customer.associate = (models) => {
        Customer.belongsTo(models.User);
        Customer.hasMany(models.Testimonial);
    }

    return Customer;
}