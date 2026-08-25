const express = require('express');
const cors = require('cors'); // Ensure cors package is imported
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = 5001;

app.use(cors()); // Allow frontend cross-origin requests
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 QuickiePay server is running on http://localhost:${PORT}`);
});