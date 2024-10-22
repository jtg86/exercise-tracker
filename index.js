const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Middleware setup
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// Define Mongoose schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// POST to create a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// GET to retrieve all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// POST to add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date() // If date not provided, use current date
    });

    const savedExercise = await newExercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(), // Use the `toDateString` format
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save exercise' });
  }
});

// GET exercise logs of a user with optional date and limit query parameters
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { userId: user._id };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0);
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exercises' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
