const express = require('express');
const cors = require('cors'); // Ensure cors package is imported
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const agentRoutes = require('./routes/agentRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const billerRoutes = require('./routes/billerRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = 5001;

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/billers', billerRoutes);
app.use('/api/system', systemRoutes);

app.listen(PORT, () => {
  console.log(`🚀 QuickiePay server is running on http://localhost:${PORT}`);
});