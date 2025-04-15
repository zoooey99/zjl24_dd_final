require('dotenv').config({ path: '.env.local' });
const { sequelize, User, Customer, Testimonial } = require('./lib/models');

async function clearDatabase() {
    try {
        // Delete all testimonials first (due to foreign key constraints)
        await Testimonial.destroy({ where: {}, truncate: true, cascade: true });
        console.log('All testimonials deleted');

        // Delete all customers
        await Customer.destroy({ where: {}, truncate: true, cascade: true });
        console.log('All customers deleted');

        // Delete all users
        await User.destroy({ where: {}, truncate: true, cascade: true });
        console.log('All users deleted');

        console.log('Database cleared successfully!');
    } catch (error) {
        console.error('Error clearing database:', error);
    } finally {
        await sequelize.close();
    }
}

clearDatabase(); 