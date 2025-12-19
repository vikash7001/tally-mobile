const express = require("express");
const { Client } = require("pg");

const app = express();
const PORT = 3000;

// DB connection
const db = new Client({
  host: "localhost",
  user: "postgres",
  password: "postgres123",
  database: "tally_mobile",
  port: 5432
});

db.connect();

// API: Stock Summary
app.get("/api/stock-summary", async (req, res) => {
  try {
    const dataResult = await db.query(`
      SELECT item_name, closing_qty, unit
      FROM stock_snapshot
      WHERE company_id = 'DEFAULT'
      ORDER BY item_name
    `);

    const syncResult = await db.query(`
      SELECT MAX(synced_at) AS last_synced
      FROM stock_snapshot
      WHERE company_id = 'DEFAULT'
    `);

    res.json({
      source: "As per Tally",
      lastSyncedAt: syncResult.rows[0].last_synced,
      data: dataResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
