const { raw } = require('express');
const { Customer, User, Testimonial } = require('./models');  // Make sure we import all models

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
        console.log('Raw Data:');
        console.log('Customers:', customers);
        console.log('Users:', users);
        console.log('Testimonials:', testimonials);

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
        res.render('dashboard', {'user': user, 'customers': customers});

    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(500).send('Error loading dashboard');
    }
}

//STRIPE
exports.addStripeKey = async (req,res) => {
    const {userId, stripe_api_key} = req.body;
    try{
        const user = await User.update(
            { stripe_api_key: stripe_api_key },
            { where: { user_id: userId } }
        )
        res.redirect('/dashboard')

    }catch (err){
        console.error('Error storing Stripe API key:', err);
        res.status(500).send('Issue with storing the Stripe API Key')
    }
} //currently unused
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
const getCustomersByUser = async (user_id) => {
    const user = await User.findByPk(user_id, {include:[{model:Customer,required:true}]});
    console.log('&&&&&&&&&&&&&&&Customers to be show (if they do not appear on the page then something is wrong with the html frontend')
    console.log(user.Customers)
    return user.Customers;
};