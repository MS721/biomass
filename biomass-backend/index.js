const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*', 
  methods: ['GET', 'POST']
}));

app.use(express.json());

app.post('/api/webhook', async (req, res) => {
  try {
    const entry = await prisma.submission.create({ data: { payload: req.body } });
    res.status(200).send("Saved");
  } catch (error) {
    res.status(500).send("Error");
  }
});

app.get('/api/submissions', async (req, res) => {
  try {
    const data = await prisma.submission.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// For Vercel, we export the app instead of just app.listen
module.exports = app; 

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server live on ${PORT}`));
}