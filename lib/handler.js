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
    const user = await User.findOne({where: { email } });

    if(!user||!(await User.validPassword(password, user.password))){
        return res.status(401).send('Invalid credentials');
    }

    req.session.userId = user.user_id;
    res.redirect('/dashboard');
}

exports.postSignup = async (req, res) => {
    const {email, password} = req.body;
    try{
        const user = await User.create({email, password});
        req.session.userId = user.user_id;
        res.redirect('/dashboard', {userId: user.user_id})
    }catch(err){
        res.status(400).send('User already exists');
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
exports.postStripe = async (req,res) => {
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