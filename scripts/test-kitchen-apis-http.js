const http = require("http");

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function getCsrfToken() {
  const res = await request("http://127.0.0.1:3000/api/auth/csrf");
  const cookies = res.headers["set-cookie"] || [];
  const csrfCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const json = JSON.parse(res.body);
  return { csrfToken: json.csrfToken, csrfCookie };
}

async function loginKitchen(email, password) {
  const { csrfToken, csrfCookie } = await getCsrfToken();
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    portal: "kitchen",
    redirect: "false",
    json: "true",
  }).toString();

  const res = await request("http://127.0.0.1:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body,
  });

  const cookies = res.headers["set-cookie"] || [];
  const sessionCookie = cookies.map((c) => c.split(";")[0]).join("; ");

  return {
    status: res.status,
    sessionCookie: sessionCookie ? `${sessionCookie}; ${csrfCookie}` : csrfCookie,
  };
}

async function runHttpTests() {
  console.log("=================================================================");
  console.log("    NutriFlexs Kitchen API & Dashboard HTTP Integration Tests    ");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Login as kitchen staff
    console.log("[Test 1] Authenticating Kitchen Staff...");
    const authRes = await loginKitchen("kitchen@nutriflexs.com", "Kitchen@NutriFlexs2026!");
    assert(authRes.status === 200, "Kitchen authentication returned HTTP 200");
    const cookieHeader = authRes.sessionCookie;

    // 2. Outlets API
    console.log("\n[Test 2] GET /api/kitchen/outlets");
    const outletsRes = await request("http://127.0.0.1:3000/api/kitchen/outlets", {
      headers: { Cookie: cookieHeader },
    });
    const outletsData = JSON.parse(outletsRes.body);
    assert(
      outletsRes.status === 200 && outletsData.success === true,
      `Outlets API returned successfully (Active Outlet: '${outletsData.currentOutletName}')`
    );
    const outletId = outletsData.currentOutletId;

    // 3. Orders API
    console.log("\n[Test 3] GET /api/kitchen/orders");
    const ordersRes = await request(`http://127.0.0.1:3000/api/kitchen/orders?outletId=${outletId}`, {
      headers: { Cookie: cookieHeader },
    });
    const ordersData = JSON.parse(ordersRes.body);
    assert(
      ordersRes.status === 200 && ordersData.success === true && Array.isArray(ordersData.orders),
      `Orders API returned ${ordersData.orders.length} orders with KDS KPIs (New: ${ordersData.kpi.newOrdersCount}, Preparing: ${ordersData.kpi.preparingOrdersCount})`
    );

    // 4. Inventory Overview & Items API
    console.log("\n[Test 4] GET /api/kitchen/inventory");
    const invRes = await request(`http://127.0.0.1:3000/api/kitchen/inventory?outletId=${outletId}`, {
      headers: { Cookie: cookieHeader },
    });
    const invData = JSON.parse(invRes.body);
    assert(
      invRes.status === 200 && invData.success === true && invData.items.length > 0,
      `Inventory API returned ${invData.items.length} ingredients (Valuation: ₹${invData.overview.totalValuation})`
    );

    // 5. Add Inventory Item via POST /api/kitchen/inventory
    console.log("\n[Test 5] POST /api/kitchen/inventory (Add Ingredient)");
    const addRes = await request("http://127.0.0.1:3000/api/kitchen/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        requestedOutletId: outletId,
        ingredientName: `Organic Blueberries Test ${Date.now()}`,
        category: "Produce",
        unit: "kg",
        quantity: 8.5,
        lowStockThreshold: 3,
        purchasePricePerUnit: 350,
        supplier: "Himalayan Berries Co.",
        storageLocation: "Chiller Rack B",
      }),
    });
    const addData = JSON.parse(addRes.body);
    assert(
      addRes.status === 200 && addData.success === true && addData.item.quantity === 8.5,
      `Created new inventory ingredient: ${addData.item?.ingredient?.name || "Item"} (Stock: 8.5kg)`
    );
    const createdItemId = addData.item.id;

    // 6. Restock Item via POST /api/kitchen/inventory/restock
    console.log("\n[Test 6] POST /api/kitchen/inventory/restock (Stock Receiving)");
    const restockRes = await request("http://127.0.0.1:3000/api/kitchen/inventory/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        requestedOutletId: outletId,
        inventoryItemId: createdItemId,
        quantityReceived: 4.0,
        costPerUnit: 350,
        supplier: "Himalayan Berries Co.",
        batchNumber: `BLUE-BATCH-${Date.now()}`,
        notes: "Automated API restock test",
      }),
    });
    const restockData = JSON.parse(restockRes.body);
    assert(
      restockRes.status === 200 && restockData.success === true && restockData.newStock === 12.5,
      `Restocked 4.0kg (New stock: ${restockData.newStock}kg, Receipt #${restockData.receiptNumber})`
    );

    // 7. Stock Adjustment via POST /api/kitchen/inventory/adjust
    console.log("\n[Test 7] POST /api/kitchen/inventory/adjust (Audit Recount)");
    const adjustRes = await request("http://127.0.0.1:3000/api/kitchen/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        requestedOutletId: outletId,
        inventoryItemId: createdItemId,
        adjustmentType: "SET",
        quantity: 12.0,
        reason: "Physical scale audit recount",
      }),
    });
    const adjustData = JSON.parse(adjustRes.body);
    assert(
      adjustRes.status === 200 && adjustData.success === true && adjustData.newStock === 12.0,
      `Adjusted stock from ${adjustData.previousStock}kg to ${adjustData.newStock}kg with audit reason`
    );

    // 8. Record Wastage via POST /api/kitchen/inventory/wastage
    console.log("\n[Test 8] POST /api/kitchen/inventory/wastage");
    const wasteRes = await request("http://127.0.0.1:3000/api/kitchen/inventory/wastage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        requestedOutletId: outletId,
        inventoryItemId: createdItemId,
        quantityWasted: 1.0,
        reason: "Crushed in transit",
        notes: "Damaged container during unboxing",
      }),
    });
    const wasteData = JSON.parse(wasteRes.body);
    assert(
      wasteRes.status === 200 && wasteData.success === true && wasteData.newStock === 11.0,
      `Wastage recorded: 1.0kg deducted, new stock: ${wasteData.newStock}kg`
    );

    // 9. Stock Movement Audit Ledger via GET /api/kitchen/inventory/movements
    console.log("\n[Test 9] GET /api/kitchen/inventory/movements");
    const moveRes = await request(
      `http://127.0.0.1:3000/api/kitchen/inventory/movements?outletId=${outletId}&limit=10`,
      { headers: { Cookie: cookieHeader } }
    );
    const moveData = JSON.parse(moveRes.body);
    assert(
      moveRes.status === 200 && moveData.success === true && moveData.movements.length > 0,
      `Movements ledger returned ${moveData.total} audit trail events`
    );

    // 10. Operational Reports via GET /api/kitchen/reports
    console.log("\n[Test 10] GET /api/kitchen/reports");
    const repRes = await request(`http://127.0.0.1:3000/api/kitchen/reports?outletId=${outletId}`, {
      headers: { Cookie: cookieHeader },
    });
    const repData = JSON.parse(repRes.body);
    assert(
      repRes.status === 200 && repData.success === true && repData.today !== undefined,
      `Reports API returned full operational metrics (Today's orders: ${repData.today.totalOrders}, Revenue: ₹${repData.today.revenue})`
    );

    // 11. Verify GET /kitchen HTML route renders 200
    console.log("\n[Test 11] GET /kitchen Dashboard Web Route");
    const kitchenPageRes = await request("http://127.0.0.1:3000/kitchen", {
      headers: { Cookie: cookieHeader },
    });
    assert(
      kitchenPageRes.status === 200 && kitchenPageRes.body.includes("NutriFlexs"),
      `GET /kitchen returned HTTP 200 with NutriFlexs Kitchen OS markup`
    );

    console.log("\n=================================================================");
    console.log(`HTTP Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log("=================================================================\n");
  } catch (err) {
    console.error("HTTP Test execution failed:", err);
  }
}

runHttpTests();
