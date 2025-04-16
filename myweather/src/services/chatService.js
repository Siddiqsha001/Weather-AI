const API_BASE = "https://backend-3-b892.onrender.com";


export async function sendMessageToGemini(message, city = null) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message,
        ...(city && { city }) 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Chat service error");
    }

    return await response.json();
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

export async function getWeatherSummary(city) {
  try {
    const response = await sendMessageToGemini(
      "What's the current weather?", 
      city
    );
    
    if (response.error) {
      throw new Error(response.error);
    }

    return {
      response: response.response,
      weather_data: response.weather_data || {
        city,
        description: "Weather data not available",
        temp: null,
        icon: null
      }
    };
  } catch (error) {
    console.error('Weather error:', error);
    throw error;
  }
}

// New functions for chat history
export async function getChatHistory() {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch chat history");
    }

    return await response.json();
  } catch (error) {
    console.error('Chat history error:', error);
    throw error;
  }
}

export async function saveChatSession(chatData) {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatData)
    });

    if (!response.ok) {
      throw new Error("Failed to save chat session");
    }

    return await response.json();
  } catch (error) {
    console.error('Save chat error:', error);
    throw error;
  }
}
