// Import required modules
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();

const expired_time = 60*60*1000

app.use(express.static("public"));

// Load environment variables
require('dotenv').config();


var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}`,
	crypto: {
		secret: `${process.env.MONGODB_SESSION_SECRET}`
	}
})

app.use(session({ 
    secret: `${process.env.NODE_SESSION_SECRET}`,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

// Authenticate user middleware
const authenticateUser = (req, res, next) => {
    if (!req.session.global_authenticate) {
        return res.redirect('/')    }
    next();
};


// Set up middleware to parse form data
app.use(express.urlencoded({ extended: true }));


const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});


// Define login route
app.get('/login', (req, res) => {
    // Check if user is already logged in
    if (req.session.userId) {
        res.redirect('/members');
    } else {
        res.send(`
            <h1>Login</h1>
            <form method="post" action="/loginSubmit">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required><br><br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required><br><br>
                <input type="submit" value="Log in">
            </form>
        `);
    }
});

// Sign up page
app.get('/signup', (req, res) => {
    res.send(`
        <h1>Sign up</h1>
        <form method="post" action="/signupSubmit">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" required><br><br>
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required><br><br>
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required><br><br>
            <input type="submit" value="Sign up">
        </form>
    `);
})

// Sign up submit
app.post('/signupSubmit', async (req, res) => {
    const { name, email } = req.body;
    // Hash password using bcrypt
    const password = await bcrypt.hash(req.body.password, 10);
    // const passwordHash = password;
    // Create new user

    const User = mongoose.model('User', userSchema);
    const user = new User({
        name,
        email,
        password
    });

    // Save user in database
    await user.save();
    // Redirect to login page
    req.session.name = user.name;
    req.session.global_authenticate = true;
    req.session.cookie.maxAge = expired_time

    res.redirect('/login');
})


// Define members route


// Define login post route
// Define login post route
app.post('/loginSubmit', async (req, res) => {
    const { email, password } = req.body;

    // Find user in database
    const User = mongoose.model('User', userSchema);
    const user = await User.findOne({ email: email });
    if (user === null) {
        res.send(`
            <h1>Your email is not registered! Please sign up!</h1>
        `);
    } 
    const validate = await bcrypt.compareSync (req.body.password, user.password)
    console.log(validate.error)
    if (validate === false) {
        res.send(`
            <h1>Your password is incorrect!</h1>
        `);
    }
    // Check if password is correct
    if (validate === true) {
        // Save user name
        req.session.name = user.name;
        req.session.global_authenticate = true;
        req.session.cookie.maxAge = expired_time


        // Redirect to members page
        res.redirect('/members');
    }
});


// Define signout route
app.get('/signout', (req, res) => {
    // Clear user ID from session and redirect to home page
    req.session.userId = null;
    res.redirect('/');
});

// Start server
mongoose.connect(`mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}`)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log('Listening to server!');
        });
    })
    .catch(err => console.error(err));

app.get('/', (req, res) => {
    if (req.session.global_authenticate) {
        res.send(`
            <h1>Welcome to the Home Page, ${req.session.name}!</h1>
            <form method="get" action="/members">
            <input type="submit" value="Members">
            </form>
            <br><br>
            <form method="post" action="/signout">
                <input type="submit" value="Sign Out">
            </form>
        `);
    } else {
        res.send(`
            <h1>Welcome to the Home Page!</h1>
            <form method="get" action="/login">
                <input type="submit" value="Log In">
            </form>
            <form method="get" action="/signup">
                <input type="submit" value="Sign Up">
            </form>
        `);
    }
});
    


app.get('/members', authenticateUser,  (req, res) => {
   

    const randomImage = Math.floor(Math.random() * 3) + 1;
    
    res.send(`

        <h1>Welcome to the Members Page, ${req.session.name}!</h1>
        <h1>Random Image</h1>
        <img src="pic${randomImage}.png" alt="Random Image">
        <br><br>
        <form method="post" action="/signout">
            <input type="submit" value="Sign Out">
        </form>
    `);
});



app.post('/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('*', (req, res) => {

    res.status(404)

    res.send('404 Page Not Found');
})
