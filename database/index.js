const express = require('express');
const cors = require('cors'); // Ensure cors package is imported
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const agentRoutes = require('./routes/agentRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const billerRoutes = require('./routes/billerRoutes');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/billers', billerRoutes);

app.listen(PORT, () => {
  console.log(`🚀 QuickiePay server is running on http://localhost:${PORT}`);
});