const express = require('express');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = 5001;

app.use(express.json());

app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 QuickiePay server is running on http://localhost:${PORT}`);
});