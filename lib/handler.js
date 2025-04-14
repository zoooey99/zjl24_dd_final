const { Customer, User, Testimonial } = require('./models');  // Make sure we import all models

exports.home = (req, res) => {
    res.type('text/html')
    res.render('login')
}

exports.db_test = async (req, res) => {
     try {
    //     // First check if we already have data
    //     const [customerCount, userCount, testimonialCount] = await Promise.all([
    //         Customer.count(),
    //         User.count(),
    //         Testimonial.count()
    //     ]);

    //     // Only create test data if tables are empty
    //     if (customerCount === 0) {
    //         await Customer.bulkCreate([
    //             { name: 'John Doe', email: 'john@example.com' },
    //             { name: 'Jane Smith', email: 'jane@example.com' },
    //             { name: 'Bob Wilson', email: 'bob@example.com' }
    //         ]);
    //     }

    //     if (userCount === 0) {
    //         await User.bulkCreate([
    //             { email: 'user1@example.com', password: 'password123', stripe_api_key: 'sk_test_1' },
    //             { email: 'user2@example.com', password: 'password456', stripe_api_key: 'sk_test_2' }
    //         ]);
    //     }

    //     if (testimonialCount === 0) {
    //         await Testimonial.bulkCreate([
    //             { testimonial: 'Great service!', status: 'approved', stars: 5 },
    //             { testimonial: 'Very satisfied', status: 'approved', stars: 4 },
    //             { testimonial: 'Would recommend', status: 'pending', stars: 5 }
    //         ]);
    //     }

        // Fetch all data as raw objects
        const [customers, users, testimonials] = await Promise.all([
            Customer.findAll({
                raw: true,  // Get plain objects
                nest: true  // Nest the results for easier handling
            }),
            User.findAll({
                raw: true,
                nest: true
            }),
            Testimonial.findAll({
                raw: true,
                nest: true
            })
        ]);

        // Log the raw data to console for debugging
        console.log('Raw Data:');
        console.log('Customers:', customers);
        console.log('Users:', users);
        console.log('Testimonials:', testimonials);

        // Render the template with the raw data
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
    const {email, password} = req.body;
    try {
        // First check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).send('A user with this email already exists');
        }

        const user = await User.create({email, password});
        console.log('User created:', {
            userId: user.user_id,
            email: user.email
        });
        
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
        const user = await User.findOne({
            where: { user_id: req.session.userId }
        });
        
        if (!user) {
            return res.redirect('/login');
        }

        res.render('dashboard', { 
            userId: user.user_id,
            email: user.email,
            stripe_api_key: user.stripe_api_key
        });
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
}

exports.pullStripeData = async (req,res) => {
    const {userId} = req.body;
    try {
        const user = await User.findOne({where: { user_id: userId}});
        if (!user) {
            return res.status(404).send('User not found');
        }
        if (!user.stripe_api_key) {
            return res.status(400).send('No Stripe API key found for user');
        }

        const stripe = require('stripe')(user.stripe_api_key);
        const customers = await stripe.customers.list({
            limit: 100
        });
        
        // Create customers in database
        for (const customer of customers.data) {
            const {name, email} = customer;
            await Customer.create({
                name,
                email,
                user_id: userId  // Associate with the current user
            });
        }
        
        res.render('customers', {customers: customers.data});
    } catch(err) {
        console.error('Error fetching Stripe customers:', err);
        res.status(500).send('Error fetching Stripe customers');
    }
}