// Temporary debug utility to test API connectivity
export async function debugApiConnection() {
  const baseUrl = "https://kuwrhanybqhfnwvshedl.functions.supabase.co";
  
  try {
    console.log("Testing API connectivity...");
    
    // Test 1: Direct function call
    const response = await fetch(`${baseUrl}/api-countries/api/countries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log("API Response status:", response.status);
    console.log("API Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error response:", errorText);
      return { success: false, error: errorText, status: response.status };
    }
    
    const data = await response.json();
    console.log("API Success - First 2 countries:", data.slice(0, 2));
    return { success: true, data: data.slice(0, 5) }; // Return first 5 for debugging
    
  } catch (error) {
    console.error("Network error:", error);
    return { success: false, error: error.message };
  }
}