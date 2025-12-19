const axios = require("axios");
const { Client } = require("pg");
const { DOMParser } = require("xmldom");

// DB
const db = new Client({
  host: "localhost",
  user: "postgres",
  password: "postgres123",
  database: "tally_mobile",
  port: 5432
});

// Tally XML request
const tallyXML = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>MobileStockSummary</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
`;

async function run() {
  await db.connect();

  // 🔴 LIVE CALL TO TALLY
  const response = await axios.post(
    "http://localhost:9000",
    tallyXML,
    { headers: { "Content-Type": "text/xml" } }
  );

  const doc = new DOMParser().parseFromString(response.data, "text/xml");

  const items = doc.getElementsByTagName("MSS_ITEM");
  const qtys  = doc.getElementsByTagName("MSS_QTY");
  const units = doc.getElementsByTagName("MSS_UNIT");

  for (let i = 0; i < items.length; i++) {
    const item = items[i].textContent.trim();
    const qty  = parseFloat(qtys[i].textContent);
    const unit = units[i].textContent.trim();

    await db.query(
      `
      INSERT INTO stock_snapshot
      (company_id, item_name, closing_qty, unit, synced_at)
      VALUES ('DEFAULT', $1, $2, $3, NOW())
      ON CONFLICT (company_id, item_name)
      DO UPDATE SET
        closing_qty = EXCLUDED.closing_qty,
        unit        = EXCLUDED.unit,
        synced_at   = NOW()
      `,
      [item, qty, unit]
    );
  }

  await db.end();
  console.log("Live sync complete");
}

run().catch(err => {
  console.error("Sync failed:", err.message);
});
