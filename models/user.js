export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        user_id: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING,
        stripe_api_key: DataTypes.STRING,
    });
    

    User.associate = (models) => {
        User.hasMany(models.Customer);
    };

    return User;
};