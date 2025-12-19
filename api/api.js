require("dotenv").config();

const express = require("express");
const { Client } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("Tally Mobile API is running");
});

// Stock Summary API
app.get("/api/stock-summary", async (req, res) => {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const dataResult = await client.query(`
      SELECT item_name, closing_qty, unit
      FROM stock_snapshot
      WHERE company_id = 'DEFAULT'
      ORDER BY item_name
    `);

    const syncResult = await client.query(`
      SELECT MAX(synced_at) AS last_synced
      FROM stock_snapshot
      WHERE company_id = 'DEFAULT'
    `);

    res.json({
      source: "As per Tally",
      lastSyncedAt: syncResult.rows[0]?.last_synced || null,
      data: dataResult.rows
    });
  } catch (err) {
    console.error("DB ERROR:", err.message);
    res.status(500).json({ error: "Database error" });
  } finally {
    await client.end();
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
