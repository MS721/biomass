import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers allow Kobo and your React Frontend to talk to this file
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await client.connect();
    const db = client.db('JF_Gujarat'); 
    const collection = db.collection('submissions');

    // Handle Data from Kobo
    if (req.method === 'POST') {
      const result = await collection.insertOne({
        ...req.body,
        received_at: new Date()
      });
      return res.status(201).json({ success: true, id: result.insertedId });
    }

    // Handle Data for React Dashboard
    if (req.method === 'GET') {
      const data = await collection.find({}).sort({ received_at: -1 }).toArray();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: "Database Error", details: error.message });
  }
}
