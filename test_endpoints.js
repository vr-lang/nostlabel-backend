import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

async function runTests() {
  console.log("=== API ENDPOINT AUDIT ===");
  
  // 1. Check products
  try {
    const res = await api.get('/products');
    console.log("GET /products: WORKING (Status:", res.status, ", Products count:", res.data?.data?.products?.length, ")");
  } catch (err) {
    console.error("GET /products: FAILED. Error:", err.message);
  }

  // 2. Check categories
  try {
    const res = await api.get('/categories');
    console.log("GET /categories: WORKING (Status:", res.status, ", Categories count:", res.data?.data?.length, ")");
  } catch (err) {
    console.error("GET /categories: FAILED. Error:", err.message);
  }

  // 3. Check coupons
  try {
    const res = await api.get('/coupons');
    console.log("GET /coupons: WORKING (Status:", res.status, ")");
  } catch (err) {
    console.error("GET /coupons: FAILED (expected if protected). Error:", err.message);
  }
}

runTests();
