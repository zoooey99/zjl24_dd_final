const { raw } = require('express');
const { Customer, User, Testimonial } = require('./models');  // Make sure we import all models
const { where, Op } = require('sequelize');

exports.home = (req, res) => {
    res.type('text/html')
    res.render('login')
}

exports.db_test = async (req, res) => {
     try {
        // Fetch all data as objects
        const [customers, users, testimonials] = await Promise.all([
            Customer.findAll({
                nest: true 
            }),
            User.findAll({
                nest: true
            }),
            Testimonial.findAll({
                nest: true
            })
        ]);

        // Log the raw data to console for debugging
        // console.log('Raw Data:');
        // console.log('Customers:', customers);
        // console.log('Users:', users);
        // console.log('Testimonials:', testimonials);

        // Render the template with the data
        res.render('db_test', {
            customers,
            users,
            testimonials
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Database error: ' + err.message);
    }
}

//AUTH
exports.getLogin = (req, res) =>{
    res.type('text/html')
    res.render('login')
}
exports.getSignup = (req, res) => {
    res.type('text/html')
    res.render('signup')
}

exports.postLogin = async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await User.findOne({where: { email } });

        if(!user || !(await User.validPassword(password, user.password))){
            return res.status(401).send('Invalid credentials');
        }

        req.session.userId = user.user_id;
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).send('Error during login');
            }
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('An error occurred during login');
    }
}

exports.postSignup = async (req, res) => {
    const {email, password, stripe_api_key} = req.body;
    try {
        // First check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).send('A user with this email already exists');
        }

        // pull business name
        const Stripe = require('stripe');
        const stripe = new Stripe(stripe_api_key);
        
        // Get account information
        const account = await stripe.account.retrieve();
        const business_name = account.settings?.dashboard?.display_name || account.business_profile?.name;
        
        if (!business_name) {
            return res.status(400).send('Could not find business name in your Stripe account. Please ensure it is set in your Stripe Dashboard settings.');
        }
    
        const user = await User.create({email, password, business_name, stripe_api_key});
        console.log('User created:', {
            userId: user.user_id,
            email: user.email,
            business_name: user.business_name,
            stripe_api_key: user.stripe_api_key
        });

        // pull customers
        try{
            await pullStripeCustomers(user.user_id);
        } catch (err) {
            console.log('error pulling stripe customers on signup')
            res.status(400).send('error pulling stripe customers on signup' + err)
        }
        
        req.session.userId = user.user_id;
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).send('Error during signup');
            }
            res.redirect('/dashboard');
        });
    } catch(err) {
        console.error('Signup error:', err);
        res.status(500).send('An error occurred during signup. Please try again.');
    }
}

exports.getLogout = (req,res) =>{
    //destroys session THEN renders login screen
    req.session.destroy(()=> {
        res.redirect('/');
    })
}

exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findOne({where: { user_id: req.session.userId }});
        if (!user) {return res.redirect('/login');}
        const customers = await getCustomersByUser(user.user_id);
        const testimonials = await getTestimonialsByUser(user.user_id);

        let thisCustomer = null
        if(req.params.id){
            const id = req.params.id
            thisCustomer = await Customer.findOne({where: {customer_id: id}});
        }
        res.render('dashboard', {'user': user, 'customers': customers, 'thisCustomer': thisCustomer, 'testimonials': testimonials});
    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(500).send('Error loading dashboard');
    }
}

//STRIPE
exports.refreshCustomers = async (req, res) => {
    pullStripeCustomers(req.session.user_id)
    res.render('dashboard')
}
async function pullStripeCustomers(user_id){
    try {        
        const user = await User.findOne({where: { user_id }});
        if (!user) {
            return console.error('No user found: Sign up flow');
        }
        if (!user.stripe_api_key) {
            return console.error('No api key found: Sign up flow');
        }

        const stripe = require('stripe')(user.stripe_api_key);
        const customers = await stripe.customers.list({
            limit: 1000
        });
        
        // Delete existing customers for this user
        await Customer.destroy({
            where: { user_id }
        });
        
        // Create customers in database
        for (const customer of customers.data) {
            const {name, email} = customer;
            await user.createCustomer({
                name,
                email,
                user_id
            });
            console.log(customer);
        }

    } catch(err) {
        console.error('Error fetching Stripe customers:', err);
    }
}

//Accessing data functions
const getCustomersByUser = async (user_id) => {
    const user = await User.findByPk(user_id, {include:[{model:Customer,required:true}]});
    //console.log('&&&&&&&&&&&&&&&Customers to be show (if they do not appear on the page then something is wrong with the html frontend')
    //console.log(user.Customers)
    return user.Customers;
};
const getTestimonialsByUser = async(user_id) => {
    console.log("getTestimonialsByUser")
    const customers = await Customer.findAll({
        where: { user_id: user_id },
        attributes: ['customer_id', 'name', 'email']
    });
    
    console.log("Customers for User", customers.map(c => c.toJSON()));
    
    const customerIds = customers.map(c => c.customer_id);

    console.log("customerIds: " + customerIds)
    
    // If no customers found, no need to continue
    if (customerIds.length === 0) {
        console.log('No customers found for this user.');
        return [];
    }
    
    // First, let's see all testimonials
    const allTestimonials = await Testimonial.findAll({
        include: {
            model: Customer,
            attributes: ['customer_id', 'name', 'email']
        }
    });
    console.log('ALL TESTIMONIALS:', allTestimonials.map(t => t.toJSON()));
    
    const testimonials = await Testimonial.findAll({
        where: {
            customer_id: {
                [Op.in]: customerIds
            }
        },
        include: {
            model: Customer,
            attributes: ['customer_id', 'name', 'email']
        }
    });

    console.log('FILTERED TESTIMONIALS:', testimonials.map(t => t.toJSON()));
    return testimonials;
}

//TESTIMONIALS
exports.testimonialCreate = async (req, res) => {
    try {
        const { customer_id, testimonialContent, stars, status } = req.body;
        
        // Find the customer
        const customer = await Customer.findOne({ where: { customer_id } });
        if (!customer) {
            return res.status(404).send('Customer not found');
        }

        // Create the testimonial
        const newTestimonial = await customer.createTestimonial({
            testimonial: testimonialContent,
            status: status,
            stars: parseInt(stars),
        });
        console.log("newTestimonial" + newTestimonial)

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error creating testimonial:', err);
        res.status(500).send('Error creating testimonial');
    }
}

exports.testimonialEdit = async (req, res) => {
    try {
        const { testimonial_id, testimonial, status, stars } = req.body;
        const testimonialRecord = await Testimonial.findByPk(testimonial_id);
        
        if (!testimonialRecord) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        await testimonialRecord.update({
            testimonial,
            status,
            stars: parseInt(stars)
        });

        res.status(200).json({ message: 'Testimonial updated successfully' });
    } catch (err) {
        console.error('Error updating testimonial:', err);
        res.status(500).json({ error: 'Error updating testimonial' });
    }
}

exports.testimonialDelete = async (req, res) => {
    try {
        const testimonial = await Testimonial.findByPk(req.params.id);
        if (!testimonial) {
            return res.status(404).send('Testimonial not found');
        }
        
        await testimonial.destroy();
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error deleting testimonial:', err);
        res.status(500).send('Error deleting testimonial');
    }
}

//CUSTOMERS
exports.customersDelete = async (req,res)=>{
    const deleted = await Customer.findByPk(req.params.id)
    console.log(`Deleting User: ${deleted.id}, ${deleted.firstName} ${deleted.lastName}`)
    deleted.destroy()
    res.redirect('/dashboard')
}

exports.customersEdit = async (req, res) => {
    try {
        const { customer_id, name, email } = req.body;
        const customer = await Customer.findByPk(customer_id);
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        await customer.update({
            name,
            email
        });

        res.status(200).json({ message: 'Customer updated successfully' });
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).json({ error: 'Error updating customer' });
    }
}

exports.customersRefresh = async (req, res) => {
    console.log(req.session.user_id)
    const customers = await pullStripeCustomers(req.session.user_id)
    res.redirect('/dashboard')
}