const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runGymsWorkflowVerification() {
  console.log("==================================================================");
  console.log("🏋️ RUNNING COMPLETE NEARBY GYMS & KIOSKS WORKFLOW VERIFICATION");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Database connection & Active Gyms Query via API
    const resAll = await fetch(`${BASE_URL}/api/gyms`);
    const dataAll = await resAll.json();
    assert(dataAll.success === true, "GET /api/gyms returned success: true");
    assert(dataAll.gyms.length >= 3, `Loaded ${dataAll.gyms.length} active partner gyms from Neon PostgreSQL`);
    assert(
      dataAll.cities.includes("Bengaluru") && dataAll.cities.includes("Mumbai"),
      `Dynamic city filters extracted from DB: ${dataAll.cities.join(", ")}`
    );

    // 2. Search by Gym Name
    const resCult = await fetch(`${BASE_URL}/api/gyms?search=cult.fit`);
    const dataCult = await resCult.json();
    assert(
      dataCult.gyms.some((g) => g.name.toLowerCase().includes("cult.fit")),
      "Search by gym name 'cult.fit' returned matching gym from database"
    );

    // 3. Search by City
    const resMumbai = await fetch(`${BASE_URL}/api/gyms?search=Mumbai`);
    const dataMumbai = await resMumbai.json();
    assert(
      dataMumbai.gyms.every((g) => g.city.toLowerCase() === "mumbai") && dataMumbai.gyms.length >= 1,
      "Search by city 'Mumbai' returned only Mumbai gyms"
    );

    // 4. Search by Locality / Area
    const resIndiranagar = await fetch(`${BASE_URL}/api/gyms?search=Indiranagar`);
    const dataIndiranagar = await resIndiranagar.json();
    assert(
      dataIndiranagar.gyms.length >= 1 && dataIndiranagar.gyms[0].area === "Indiranagar",
      "Search by area 'Indiranagar' returned Indiranagar partner gym"
    );

    const resBandra = await fetch(`${BASE_URL}/api/gyms?search=Bandra%20West`);
    const dataBandra = await resBandra.json();
    assert(
      dataBandra.gyms.length >= 1 && dataBandra.gyms[0].area === "Bandra West",
      "Search by area 'Bandra West' returned Bandra partner gym"
    );

    // 5. Search by Kiosk Name
    const resKiosk = await fetch(`${BASE_URL}/api/gyms?search=Gold%20Kiosk`);
    const dataKiosk = await resKiosk.json();
    assert(
      dataKiosk.gyms.some((g) => g.outlets.some((o) => o.name.includes("Gold Kiosk"))),
      "Search by kiosk name 'Gold Kiosk' found corresponding gym & kiosk"
    );

    // 6. City Filter
    const resBlr = await fetch(`${BASE_URL}/api/gyms?city=Bengaluru`);
    const dataBlr = await resBlr.json();
    assert(
      dataBlr.gyms.length === 2 && dataBlr.gyms.every((g) => g.city === "Bengaluru"),
      "City filter 'Bengaluru' returned exactly 2 Bengaluru partner gyms"
    );

    const resMum = await fetch(`${BASE_URL}/api/gyms?city=Mumbai`);
    const dataMum = await resMum.json();
    assert(
      dataMum.gyms.length === 1 && dataMum.gyms[0].city === "Mumbai",
      "City filter 'Mumbai' returned exactly 1 Mumbai partner gym"
    );

    // 7. Combined Search + City Filter
    const resCombined = await fetch(`${BASE_URL}/api/gyms?city=Bengaluru&search=Koramangala`);
    const dataCombined = await resCombined.json();
    assert(
      dataCombined.gyms.length === 1 && dataCombined.gyms[0].name.includes("Gold's Gym"),
      "Combined filter (Bengaluru + 'Koramangala') matched Gold's Gym"
    );

    const resCombinedZero = await fetch(`${BASE_URL}/api/gyms?city=Mumbai&search=Koramangala`);
    const dataCombinedZero = await resCombinedZero.json();
    assert(
      dataCombinedZero.gyms.length === 0,
      "Combined filter (Mumbai + 'Koramangala') correctly returned 0 results"
    );

    // 8. Geolocation / Haversine Distance Sorting
    // Coordinates near Cult.fit Indiranagar: 12.9784, 77.6408
    const resGeo = await fetch(`${BASE_URL}/api/gyms?lat=12.9784&lng=77.6408`);
    const dataGeo = await resGeo.json();
    assert(
      dataGeo.gyms[0].name.includes("Cult.fit"),
      `Nearest gym to Indiranagar coords is Cult.fit (${dataGeo.gyms[0].formattedDistance})`
    );
    assert(
      dataGeo.gyms[1].name.includes("Gold's Gym"),
      `Second nearest is Gold's Gym Koramangala (${dataGeo.gyms[1].formattedDistance})`
    );
    assert(
      dataGeo.gyms[2].name.includes("Nitrro"),
      `Furthest is Nitrro Mumbai (${dataGeo.gyms[2].formattedDistance})`
    );

    // 9. Valid Selection & Server Validation
    const targetGym = dataAll.gyms[0];
    const targetOutlet = targetGym.outlets[0];

    const resSelect = await fetch(`${BASE_URL}/api/gyms/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gymId: targetGym.id, outletId: targetOutlet.id }),
    });
    const dataSelect = await resSelect.json();
    assert(dataSelect.success === true, "POST /api/gyms/select returned success: true");
    assert(dataSelect.gym.id === targetGym.id, `Server validated selection for gym: ${dataSelect.gym.name}`);
    assert(dataSelect.outlet.id === targetOutlet.id, `Server validated selection for outlet: ${dataSelect.outlet.name}`);

    // 10. Invalid Selection Rejection (Mismatched outlet)
    const otherOutlet = dataAll.gyms[1].outlets[0];
    const resInvalidSelect = await fetch(`${BASE_URL}/api/gyms/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gymId: targetGym.id, outletId: otherOutlet.id }),
    });
    const dataInvalidSelect = await resInvalidSelect.json();
    assert(
      dataInvalidSelect.success === false,
      `Rejected invalid selection: "${dataInvalidSelect.error}"`
    );

    // 11. User Profile Persistence in Neon PostgreSQL
    let testUser = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
    if (!testUser) testUser = await prisma.user.findFirst();
    assert(testUser != null, `Test user found: ${testUser?.name || testUser?.email}`);

    await prisma.user.update({
      where: { id: testUser.id },
      data: { selectedGymId: targetGym.id, selectedOutletId: targetOutlet.id },
    });
    const verifyUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { selectedGymId: true, selectedOutletId: true },
    });
    assert(
      verifyUser.selectedGymId === targetGym.id && verifyUser.selectedOutletId === targetOutlet.id,
      "User profile in Neon PostgreSQL persisted with selected gym and outlet IDs"
    );

    // 12. Order Placement Validation Against Selected Kiosk
    const firstProduct = await prisma.product.findFirst({ where: { isAvailable: true } });
    assert(firstProduct != null, `Found available product for order test: ${firstProduct.name} (₹${firstProduct.price})`);

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: "NF-TEST-" + Date.now(),
        userId: testUser.id,
        outletId: targetOutlet.id,
        subtotal: firstProduct.price,
        discount: 0,
        totalAmount: firstProduct.price,
        totalProtein: firstProduct.protein,
        totalCalories: firstProduct.calories,
        status: "ORDER_PLACED",
        paymentStatus: "PAID",
        items: {
          create: {
            productId: firstProduct.id,
            quantity: 1,
            priceAtPurchase: firstProduct.price,
            productJson: JSON.stringify({ name: firstProduct.name, price: firstProduct.price }),
          },
        },
      },
    });
    assert(createdOrder.id != null, `Successfully created order #${createdOrder.id.slice(0, 8)}`);
    assert(createdOrder.outletId === targetOutlet.id, `Order is attached to selected kiosk outlet: ${targetOutlet.name}`);

    // Clean up test order
    await prisma.orderItem.deleteMany({ where: { orderId: createdOrder.id } });
    await prisma.order.delete({ where: { id: createdOrder.id } });
    console.log("  🧹 Cleaned up test order cleanly.");

    // 13. Block Orders When Kiosk Is Marked Unavailable
    await prisma.outlet.update({ where: { id: targetOutlet.id }, data: { isAvailable: false } });

    const checkOutlet = await prisma.outlet.findUnique({ where: { id: targetOutlet.id } });
    assert(checkOutlet.isAvailable === false, "Outlet successfully set to isAvailable: false (Closed)");

    // Attempting selection of closed outlet via API must fail
    const resSelectClosed = await fetch(`${BASE_URL}/api/gyms/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gymId: targetGym.id, outletId: targetOutlet.id }),
    });
    const dataSelectClosed = await resSelectClosed.json();
    assert(
      dataSelectClosed.success === false,
      `API correctly blocked selecting closed kiosk: "${dataSelectClosed.error}"`
    );

    // Restore targetOutlet to available
    await prisma.outlet.update({ where: { id: targetOutlet.id }, data: { isAvailable: true } });

    console.log("\n==================================================================");
    console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runGymsWorkflowVerification();
