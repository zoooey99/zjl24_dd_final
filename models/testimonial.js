export default (sequelize, DataTypes) => {
    const Testimonial = sequelize.define('Testimonial', {
        testimonial: DataTypes.STRING,
        status: DataTypes.STRING,
    });
    
    Testimonial.associate = (models) => {
        Testimonial.belongsTo(models.Customer);
    }

    return Testimonial;
}