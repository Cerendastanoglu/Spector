// Simple test script to check if our Product Analytics API returns data
// This bypasses the browser and directly tests our API endpoint

const testProductAnalytics = async () => {
  console.log("🔵 Testing Product Analytics API...");
  
  try {
    // Note: This will fail because it needs authentication, but it will help us see if the route is configured
    const response = await fetch('http://localhost:3000/app/api/product-analytics');
    console.log("🟢 API Response Status:", response.status);
    console.log("🟢 API Response Headers:", [...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      console.log("🟢 API Response Data:", JSON.stringify(data, null, 2));
    } else {
      console.log("🔴 API Response Error:", response.statusText);
    }
  } catch (error) {
    console.log("🔴 Network Error:", error.message);
  }
};

testProductAnalytics();