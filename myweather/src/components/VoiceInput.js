// components/VoiceInput.js
import { useState, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';

const VoiceInput = ({ onCommand, activities, weatherData }) => {
  const [isListening, setIsListening] = useState(false);
  const [response, setResponse] = useState('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      handleVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    if (isListening) {
      recognition.start();
    }

    return () => recognition.stop();
  }, [isListening]);

  const handleVoiceCommand = (transcript) => {
    let responseText = '';
    
    // Greeting response
    if (transcript.includes('hello') || transcript.includes('hi bot')) {
      responseText = "Hello! How can I help you with your activities today?";
    }
    // Activity query
    else if (transcript.includes('activities') || transcript.includes('what\'s planned')) {
      const today = new Date().toDateString();
      const todaysActivities = activities.filter(a => 
        new Date(a.date).toDateString() === today
      );
      
      if (todaysActivities.length > 0) {
        responseText = `You have ${todaysActivities.length} activities today: `;
        responseText += todaysActivities.map(a => 
          `${a.activity_name} at ${new Date(a.date).toLocaleTimeString()}`
        ).join(', ');
        
        if (weatherData) {
          responseText += `. Weather conditions: ${weatherData.conditions}, ${weatherData.temperature}°C`;
        }
      } else {
        responseText = "You have no activities scheduled for today.";
      }
    }
    // Default response
    else {
      responseText = "I didn't understand that. Try asking about your activities.";
    }

    setResponse(responseText);
    speak(responseText);
    onCommand(transcript, responseText);
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="voice-interface">
      <button 
        onClick={() => setIsListening(!isListening)}
        className={`voice-button ${isListening ? 'listening' : ''}`}
      >
        <FaMicrophone />
      </button>
      {response && (
        <div className="voice-response">
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;