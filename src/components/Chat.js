import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini, getWeatherSummary } from '../services/chatService';
import { useWeatherContext } from '../context/WeatherContext';
import { supabase } from '../services/api';
import '../styles/Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { weatherData, userPreferences } = useWeatherContext();
useEffect(() => {
  //to load the existing messages.
  fetchChatHistory();

  //subscription
  const channel = supabase
    .channel('chat_updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chats'
    }, (payload) => {
      if (payload.new.user_id === supabase.auth.user()?.id) {
        setChatHistory(prev => prev.map(chat => 
          chat.id === payload.new.id ? payload.new : chat
        ));
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []); //cleanup 


useEffect(() => {
  if (selectedChat) {
    setInputMessage('');
  }
}, [selectedChat]);

const fetchChatHistory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const uniqueChats = data.filter(    //no duplicate chats 
      (chat, index, self) => 
        index === self.findIndex(c => c.id === chat.id)
    );

    setChatHistory(uniqueChats);
  } catch (error) {
    console.error('Fetch error:', error);
  }
};

const loadChat = async (chatId) => {
  try {
    setIsLoading(true);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.style.scrollBehavior = 'auto';
    }

    const { data, error } = await supabase
      .from('chats')
      .select('messages')
      .eq('id', chatId)
      .single();
    
    if (error) throw error;
    
    if (data) {
      setMessages(data.messages); //sets the messages
      setSelectedChat(chatId);  //selects the chat
    }

    setTimeout(() => { //scrolls to the bottom
      if (messagesContainerRef.current) {
        messagesContainerRef.current.style.scrollBehavior = 'smooth';
      }
    }, 100);
  } catch (error) {
    setError('Failed to load chat');
    console.error('Error loading chat:', error.message);
  } finally {
    setIsLoading(false);
  }
};

const startNewChat = () => {
  setMessages([]);
  setSelectedChat(null);
  setInputMessage('');
  setIsLoading(false);
};

const saveChat = async () => {
  if (messages.length === 0) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const chatTitle = messages[0].text.substring(0, 30) + 
                     (messages[0].text.length > 30 ? '...' : '');
    
    if (selectedChat) {
      const { error } = await supabase
        .from('chats')
        .update({
          messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChat);
      
      if (error) throw error;
      
      setChatHistory(prev => 
        prev.map(chat => 
          chat.id === selectedChat 
            ? { ...chat, messages, updated_at: new Date().toISOString() }
            : chat
        )
      );
    } else {
      const { data, error } = await supabase
        .from('chats')
        .insert([{
          title: chatTitle,
          messages,
          user_id: user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setChatHistory(prev => [data, ...prev]);
      setSelectedChat(data.id);
    }
  } catch (error) {
    setError('Failed to save chat');
    console.error('Error saving chat:', error.message);
  }
};

const deleteChat = async (chatId) => {
  try {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
    
    if (error) throw error;
    
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));  //ensures the deleted chat no longer appears
    
    if (selectedChat === chatId) {
      startNewChat();  //if dlt the current chat, start a new one
    }
  } catch (error) {
    setError('Failed to delete chat');
    console.error('Error deleting chat:', error.message);
  }
};

  const generateHealthRecommendations = () => {
    if (!weatherData || !userPreferences) return null;
    
    const { healthConditions = [], allergies = [], medications = [] } = userPreferences;
    const recommendations = [];
    
    healthConditions.forEach(condition => {
      switch(condition.toLowerCase()) {
        case 'asthma':
        if (weatherData.airQuality > 100) {  //weatherData is an object
            recommendations.push(` High pollution (${weatherData.airQuality}) may trigger asthma`);
        }
          break;
        case 'arthritis':
        if (weatherData.humidity > 70) {
            recommendations.push(` High humidity (${weatherData.humidity}%) may worsen arthritis`);
          }
          break;
        case 'heart disease':
          if (weatherData.temp > 32 || weatherData.temp < 5) {
            recommendations.push(` Extreme temperatures (${weatherData.temp}°C) may affect heart condition`);
          }
          break;
        default:
          break;
      }
    });
    
    allergies.forEach(allergy => {
      if (weatherData.pollen && weatherData.pollen[allergy.toLowerCase()] > 7) {
        recommendations.push(` High ${allergy} pollen level (${weatherData.pollen[allergy.toLowerCase()] / 10})`);
      }
    });
    
    return recommendations.length > 0 ? recommendations : null;
  };

  const getActivitySuggestions = () => {
    if (!weatherData || !userPreferences) return null;
    
    const { preferredActivities = [] } = userPreferences;
    const suggestions = [];
    
    if (weatherData.condition.includes('rain')) {
      suggestions.push(...preferredActivities.filter(activity =>   
        activity.toLowerCase().includes('indoor')
      ));
    } else {
      suggestions.push(...preferredActivities.filter(activity => 
        !activity.toLowerCase().includes('indoor')
      ));
    }
    
    return suggestions.length > 0 ? suggestions.slice(0, 3) : null;
  };

  const handleSendMessage = async (message, isWeatherQuery = false) => {
    if ((!message.trim() && !isWeatherQuery) || isLoading) return;
  
    setError(null);
    setIsLoading(true);
  
    try {
      const { data: { user } } = await supabase.auth.getUser();  //receives the user data in the form of promise obj
      if (!user) throw new Error('Authentication required');
  
      const userMessage = {
        text: isWeatherQuery ? 'Show me the weather' : message,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
  
      const isNewChat = messages.length === 0; //if new convo,if yes, it adds to db
      
      if (isNewChat) {
        const aiResponse = await getAIResponse(message, isWeatherQuery);
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            title: userMessage.text.substring(0, 30),
            user_id: user.id,
            messages: [userMessage, aiResponse],
            created_at: new Date().toISOString()
          })
          .select()
          .single();  //the record is returned
  
        if (error) throw error;
  
        setSelectedChat(newChat.id);
        setMessages([userMessage, aiResponse]);
        setChatHistory(prev => [newChat, ...prev]);
      } else {
        const aiResponse = await getAIResponse(message, isWeatherQuery);
        const updatedMessages = [...messages, userMessage, aiResponse];
        
        const { error } = await supabase
          .from('chats')
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedChat);
  
        if (error) throw error;
  
        setMessages(updatedMessages);
        setChatHistory(prev => prev.map(chat =>   //for updating the chats
          chat.id === selectedChat 
            ? { ...chat, messages: updatedMessages } 
            : chat
        ));
      }
    } catch (error) {
      console.error('Message error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      if (!isWeatherQuery) {
        setInputMessage('');
      }
    }
  };
  
  const getAIResponse = async (message, isWeatherQuery) => {
    if (isWeatherQuery) {
      const response = await getWeatherSummary(weatherData.city);
      return {
        type: 'weather',
        text: response.response,
        data: response.weather_data,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
    } else {
      const response = await sendMessageToGemini(message);
      return {
        text: response.response,
        type: response.weather_data ? 'weather' : 'text',
        data: response.weather_data,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
    }
  };

  const WeatherMessage = ({ data }) => {
    const healthWarnings = generateHealthRecommendations();  //call the func
    const activitySuggestions = getActivitySuggestions();
    
    return (
      <div className="weather-message">
        <h4>Weather in {data.city}</h4>
          {data.icon && (
            <img 
              src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
              alt={data.description} 
            />
          )}
        <div className="weather-details">
          <div>🌡 Temperature: {Math.round(data.temp)}°C</div>
          <div>💧 Humidity: {data.humidity}%</div>
          <div>🌬 Wind: {data.windSpeed} km/h</div>
          <div>☁ Conditions: {data.description}</div>
        </div>
        
        {healthWarnings && (
          <div className="health-advisory">
            <h5>Health Advisory</h5>
            {healthWarnings.map((warning, i) => (
              <div key={i} className="warning">{warning}</div>
            ))}
            <div className="recommendation">
              {healthWarnings.length > 0 
                ? "Consider staying indoors or taking precautions."
                : "Weather conditions are generally safe for you."}
          </div>
              </div>
            )}
            
        {activitySuggestions && (
          <div className="activity-suggestions">
            <h5>Suggested Activities</h5>
                <ul>
              {activitySuggestions.map((activity, i) => (
                    <li key={i}>{activity}</li>
                  ))}
                </ul>
              </div>
            )}
      </div>
    );
  };

  return (
    <div className={`chat-container ${isSidebarOpen ? 'with-sidebar' : ''}`}>
      <div className="chat-sidebar" style={{ display: isSidebarOpen ? 'block' : 'none' }}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button onClick={() => setIsSidebarOpen(false)} className="close-sidebar">
            ×
          </button>
        </div>
  
        <button className="new-chat-button" onClick={startNewChat}>
          + New Chat
        </button>
  
        <div className="chat-history-list">
          {chatHistory.length === 0 ? (
            <p className="no-chats">No previous chats</p>
          ) : (
            chatHistory.map(chat => (
              <div
                key={chat.id}
                className={`chat-history-item ${selectedChat === chat.id ? 'active' : ''}`}
              >
                <div className="chat-history-content" onClick={() => loadChat(chat.id)}>
                  <div className="chat-title">{chat.title}</div>
                  <div className="chat-date">
                    {new Date(chat.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  className="delete-chat-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
  
      <div className="chat-main">
        <div className="chat-header">
          {!isSidebarOpen && (
            <button
              className="open-sidebar-button"
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
          )}
          <h2>Health & Weather Assistant</h2>
        </div>
  
        <div className="chat-messages">
          {messages.length === 0 && !isLoading && (
            <div className="empty-state">
              <p>Ask me about:</p>
              <ul className="suggestion-list">
                <li>"How's the weather today?"</li>
                <li>"Should I go outside?"</li>
                <li>"Suggest some activities"</li>
                <li>"Any health concerns?"</li>
              </ul>
              {!weatherData?.city && (
                <div className="weather-warning">
                  (Set your location in profile to enable weather features)
                </div>
              )}
            </div>
          )}
  
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              {message.type === 'weather' ? (
                <WeatherMessage data={message.data} />
              ) : (
                <div className="message-content">
                  {message.text.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  {message.sender === 'ai-error' && ' 😊'}
                </div>
              )}
            </div>
          ))}
  
          {isLoading && (
            <div className="message ai loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
  
          <div ref={messagesEndRef} />
        </div>
  
        <div className="chat-input-container">
          <button
            className="weather-button"
            onClick={() => handleSendMessage('', true)}
            disabled={isLoading || !weatherData?.city}
            title={!weatherData?.city ? "Set your location in profile to enable weather" : ""}
          >
            Get Weather
          </button>
  
          <input
            type="text"
            className="chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about weather, health, or activities..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
            disabled={isLoading}
          />
  
          <button
            className="send-button"
            onClick={() => handleSendMessage(inputMessage)}
            disabled={isLoading || !inputMessage.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
  
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="dismiss-error">
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;


//Gets the input from the user  
//pass the message to the backend using /chat
//gemini api->sends the message to the api, fetches the data
//async func -> getting the message and location from the gemini and it can fetch the real time data directly
//