require('dotenv').config({ path: './env/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const corsOptions = {
  origin: 'https://Guiderbooksai.netlify.app', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
 
};
app.use(cors(corsOptions));

app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.warn('⚠️  MONGODB_URI is not set. MongoDB features will not work. Please add MONGODB_URI to backend/env/.env');
}

app.use('/api/chapter', require('./routes/chapter'));
app.use('/api/summary', require('./routes/summary'));
app.use('/api/questions', require('./routes/question'));
app.use('/api/ask', require('./routes/ask'));
app.use('/api/ask-chapter', require('./routes/ask-chapter'));
app.use('/api/scan-question', require('./routes/scan-question'));
app.use('/api/assessment', require('./routes/assessment'));

app.get('/', (req, res) => {
  res.send('Backend API is running');
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
