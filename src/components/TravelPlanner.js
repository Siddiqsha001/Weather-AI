import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, FormControl, Select, MenuItem, Checkbox, 
  FormControlLabel, Typography, Paper, Alert, LinearProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, IconButton, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';   //react date picker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';  //date library
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { jsPDF } from 'jspdf'; //generate PDF
import 'jspdf-autotable'; //plugin for creating PDF
import { WiDaySunny, WiRain, WiSnow, WiCloudy, WiDayCloudyHigh } from 'react-icons/wi';
import { supabase } from '../services/api';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';

const API_KEY = 'a1f2098f41a7336f39b5b267165ac12a';

const TravelPlanner = () => {
  const { roomId } = useParams();  // Get roomId from URL params
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  //existing state
  const [destination, setDestination] = useState('');
  const [travelMode, setTravelMode] = useState('flight');
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs().add(1, 'day'));
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [packingList, setPackingList] = useState([]);
  const [customItem, setCustomItem] = useState('');

  //new state for rooms
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [roomPreview, setRoomPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [updatingItem, setUpdatingItem] = useState(false);

  //add new state for saving
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);

  //handle room creation
  const handleCreateRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please login first');

      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: room, error } = await supabase
        .from('travel_rooms')
        .insert([
          {
            name: roomName,
            code: roomCode,
            created_by: user.id,
            destination: destination || null,
            start_date: startDate?.toISOString() || null,
            end_date: endDate?.toISOString() || null,
            travel_mode: travelMode
          }
        ])
        .select()
        .single();

      if (error) throw error;

      //join the room automatically after creating
      await supabase
        .from('room_members')
        .insert([
          {
            room_id: room.id,
            user_id: user.id,
            role: 'admin'
          }
        ]);

      setCurrentRoom(room);
      setShowCreateRoom(false);
      fetchRoomMembers(room.id);
    } catch (err) {
      setError(err.message);
    }
  };

  //joining a room
  const handleJoinRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please login first');

      //verify room exists
      const { data: roomCheck, error: roomError } = await supabase
        .from('travel_rooms')
        .select('id, code')
        .eq('code', roomCode.toUpperCase())
        .single();

      if (roomError) throw new Error('Room not found');

      //if already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomCheck.id)
        .eq('user_id', user.id)
        .single();

      if (!existingMember) {
        //join as new member
        await supabase
          .from('room_members')
          .insert([{
            room_id: roomCheck.id,
            user_id: user.id,
            role: 'member'
          }]);
      }

      //fetch full room details
      const { data: room, error: fullRoomError } = await supabase
        .from('travel_rooms')
        .select('*')
        .eq('id', roomCheck.id)
        .single();

      if (fullRoomError) throw fullRoomError;

      //set room and load all data
      setCurrentRoom(room);
      setShowJoinRoom(false);
      fetchRoomMembers(room.id);

      setDestination(room.destination || '');
      setStartDate(room.start_date ? dayjs(room.start_date) : null);
      setEndDate(room.end_date ? dayjs(room.end_date) : null);
      setTravelMode(room.travel_mode || 'flight');
      if (room.weather_data) setWeatherData(room.weather_data);
      if (room.forecast_data) setForecastData(room.forecast_data);
      if (room.packing_list) setPackingList(room.packing_list);

    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRoomMembers = async (roomId) => {
    try {
      const { data: members, error } = await supabase
        .from('room_members')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId);

      if (error) throw error;
      setRoomMembers(members);
    } catch (err) {
      console.error('Error fetching room members:', err);
    }
  };

  const fetchUserRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rooms, error } = await supabase
        .from('room_members')
        .select(`
          travel_rooms (
            id,
            name,
            code,
            destination,
            created_at,
            created_by
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setAvailableRooms(rooms.map(r => r.travel_rooms));
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentRoom) return;

      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      setCurrentRoom(null);
      setRoomMembers([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentRoom) return;

      //if user is admin
      const isAdmin = roomMembers.some(member => 
        member.user_id === user.id && member.role === 'admin'
      );

      if (!isAdmin) {
        throw new Error('Only room administrators can delete rooms');
      }

      await supabase.from('travel_rooms').delete().eq('id', currentRoom.id);
      
      setCurrentRoom(null);
      setRoomMembers([]);
      fetchUserRooms();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateRoomData = async () => {
    if (!currentRoom) return;

    try {
      await supabase
        .from('travel_rooms')
        .update({
          destination,
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
          travel_mode: travelMode
        })
        .eq('id', currentRoom.id);
    } catch (err) {
      console.error('Error updating room data:', err);
    }
  };

  useEffect(() => {
    if (!currentRoom) return;

    let lastUpdate = null;

    const roomSubscription = supabase
      .channel(`room:${currentRoom.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'travel_rooms',
        filter: `id=eq.${currentRoom.id}`
      }, payload => {
        if (payload.new && !updatingItem) {
          const newRoom = payload.new;
          
          //prevents duplicate updates by checking timestamp
          if (lastUpdate !== newRoom.last_updated_at) {
            lastUpdate = newRoom.last_updated_at;
            
            if (newRoom.packing_list) {  //array
              //compare list contents to avoid duplicates
              const currentIds = new Set(packingList.map(item => item.id));
              const newIds = new Set(newRoom.packing_list.map(item => item.id));
              
              const needsUpdate = packingList.some(item => {
                const newItem = newRoom.packing_list.find(ni => ni.id === item.id);
                return !newItem || newItem.checked !== item.checked;
              });
              
              if (needsUpdate || currentIds.size !== newIds.size) {
                setPackingList(newRoom.packing_list);
              }
            }

            setDestination(newRoom.destination || '');
            setStartDate(newRoom.start_date ? dayjs(newRoom.start_date) : null);
            setEndDate(newRoom.end_date ? dayjs(newRoom.end_date) : null);
            setTravelMode(newRoom.travel_mode || 'flight');
            if (newRoom.weather_data) setWeatherData(newRoom.weather_data);
            if (newRoom.forecast_data) setForecastData(newRoom.forecast_data);
          }
        }
      })
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
    };
  }, [currentRoom, updatingItem]);

  useEffect(() => {
    fetchUserRooms();
  }, []);

  //update room data 
  useEffect(() => {
    updateRoomData();
  }, [destination, startDate, endDate, travelMode]);

  const handleSaveTravel = async () => {
    if (!currentRoom) return;
    setIsSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('travel_rooms')
        .update({
          destination,
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
          travel_mode: travelMode,
          weather_data: weatherData,
          forecast_data: forecastData,
          packing_list: packingList,
          last_updated_by: (await supabase.auth.getUser()).data.user.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', currentRoom.id);

      if (error) throw error;
    } catch (err) {
      setError('Failed to save travel details: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  //add auto-save when data changes
  useEffect(() => {
    if (!currentRoom) return;
    
    const autoSave = async () => {
      try {
        await supabase
          .from('travel_rooms')
          .update({
            destination,
            start_date: startDate?.toISOString(),
            end_date: endDate?.toISOString(),
            travel_mode: travelMode,
            weather_data: weatherData,
            forecast_data: forecastData,
            last_updated_by: (await supabase.auth.getUser()).data.user.id,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', currentRoom.id);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [destination, startDate, endDate, travelMode, weatherData, forecastData, currentRoom]);

  const handlePreviewRoom = async () => {
    if (!roomCode) return;
    setPreviewLoading(true);
    try {
      const { data: room, error } = await supabase
        .from('travel_rooms')
        .select(`
          id, 
          name,
          code,
          destination,
          start_date,
          end_date,
          travel_mode,
          created_at,
          created_by,
          room_members!inner (
            user_id,
            role,
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('code', roomCode.toUpperCase())
        .single();

      if (error) throw new Error('Room not found');
      setRoomPreview(room);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  const handleCloseJoinDialog = () => {
    setShowJoinRoom(false);
    setRoomPreview(null);
    setRoomCode('');
  };

  const getWeatherIcon = (condition) => {
    const mainCondition = condition.toLowerCase();
    switch (mainCondition) {
      case 'clear':
        return <WiDaySunny size={40} color="#FFA500" />;
      case 'rain':
        return <WiRain size={40} color="#4682B4" />;
      case 'snow':
        return <WiSnow size={40} color="#87CEEB" />;
      case 'clouds':
        return <WiCloudy size={40} color="#778899" />;
      case 'mist':
      case 'haze':
        return <WiDayCloudyHigh size={40} color="#A9A9A9" />;
      default:
        return <WiDaySunny size={40} color="#FFA500" />;
    }
  };

  const fetchWeatherData = async () => {
    if (!destination) {
      setError('Please enter a destination');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Please select travel dates');
      return;
    }
    
    setLoading(true);
    setError(null);
    setPackingList([]);  //clears existing pack list
    
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${destination}&units=metric&appid=${API_KEY}`
      );
      
      if (!weatherResponse.ok) {
        throw new Error('City not found. Please check the spelling or try another location.');
      }
      
      const weatherData = await weatherResponse.json();
      
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${destination}&units=metric&appid=${API_KEY}`
      );
      
      const forecastData = await forecastResponse.json();
      
      setWeatherData(weatherData);
      setForecastData(forecastData);

      const basePackingList = [
        { id: Date.now() + 1, item: 'Travel documents', checked: false, category: 'essentials' },
        { id: Date.now() + 2, item: 'Phone charger', checked: false, category: 'electronics' },
        { id: Date.now() + 3, item: 'Toiletries', checked: false, category: 'essentials' },
      ];

      if (travelMode === 'flight') {
        basePackingList.push(
          { id: Date.now() + 4, item: 'Passport', checked: false, category: 'essentials' },
          { id: Date.now() + 5, item: 'Boarding pass', checked: false, category: 'essentials' },
          { id: Date.now() + 6, item: 'TSA-approved toiletries', checked: false, category: 'essentials' }
        );
      } else if (travelMode === 'car') {
        basePackingList.push(
          { id: Date.now() + 7, item: 'Driver\'s license', checked: false, category: 'essentials' },
          { id: Date.now() + 8, item: 'Car documents', checked: false, category: 'essentials' },
          { id: Date.now() + 9, item: 'Emergency kit', checked: false, category: 'safety' }
        );
      }

      setPackingList(basePackingList);
      
    } catch (err) {
      setError(err.message || 'Failed to fetch weather data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (weatherData) {
      updatePackingListBasedOnWeather();
    }
  }, [weatherData]);

  const updatePackingListBasedOnWeather = async () => {
    if (!weatherData || !currentRoom) return;
    
    try {
      const { data: latestRoom } = await supabase
        .from('travel_rooms')
        .select('packing_list')
        .eq('id', currentRoom.id)
        .single();

      const existingList = latestRoom?.packing_list || [];
      const existingItems = new Set(existingList.map(item => item.item.toLowerCase()));
      
      const newItems = [];
      const temp = weatherData.main.temp;
      const weatherCondition = weatherData.weather[0].main.toLowerCase();
      const destinationLower = destination.toLowerCase();
      
      const addUniqueItems = (items) => {
        items.forEach(item => {
          if (!existingItems.has(item.item.toLowerCase())) {
            newItems.push(item);
            existingItems.add(item.item.toLowerCase());
          }
        });
      };

      const essentialItems = [
        { id: Date.now() + 1, item: 'Travel documents', checked: false, category: 'essentials' },
        { id: Date.now() + 2, item: 'Phone charger', checked: false, category: 'electronics' },
        { id: Date.now() + 3, item: 'Power bank', checked: false, category: 'electronics' },
        { id: Date.now() + 4, item: 'First aid kit', checked: false, category: 'health' },
        { id: Date.now() + 5, item: 'Hand sanitizer', checked: false, category: 'health' },
        { id: Date.now() + 6, item: 'Face masks', checked: false, category: 'health' },
        { id: Date.now() + 7, item: 'Water bottle', checked: false, category: 'essentials' },
        { id: Date.now() + 8, item: 'Snacks', checked: false, category: 'food' }
      ];
      addUniqueItems(essentialItems);

      //specific items
      if (travelMode === 'flight') {
        addUniqueItems([
          { id: Date.now() + 10, item: 'Passport', checked: false, category: 'travel-documents' },
          { id: Date.now() + 11, item: 'Boarding pass', checked: false, category: 'travel-documents' },
          { id: Date.now() + 12, item: 'Visa documents', checked: false, category: 'travel-documents' },
          { id: Date.now() + 13, item: 'Travel insurance', checked: false, category: 'travel-documents' },
          { id: Date.now() + 14, item: 'TSA-approved toiletries', checked: false, category: 'essentials' },
          { id: Date.now() + 15, item: 'Compression socks', checked: false, category: 'clothing' },
          { id: Date.now() + 16, item: 'Eye mask', checked: false, category: 'comfort' },
          { id: Date.now() + 17, item: 'Travel pillow', checked: false, category: 'comfort' },
          { id: Date.now() + 18, item: 'Noise-canceling headphones', checked: false, category: 'electronics' },
          { id: Date.now() + 19, item: 'Entertainment device', checked: false, category: 'electronics' },
          { id: Date.now() + 20, item: 'Universal adapter', checked: false, category: 'electronics' },
          { id: Date.now() + 21, item: 'Empty water bottle', checked: false, category: 'essentials' },
          { id: Date.now() + 22, item: 'Luggage lock', checked: false, category: 'accessories' },
          { id: Date.now() + 23, item: 'Luggage scale', checked: false, category: 'accessories' },
          { id: Date.now() + 24, item: 'Flight socks', checked: false, category: 'clothing' }
        ]);
      } else if (travelMode === 'train') {
        addUniqueItems([
          { id: Date.now() + 30, item: 'Train ticket', checked: false, category: 'travel-documents' },
          { id: Date.now() + 31, item: 'ID card', checked: false, category: 'travel-documents' },
          { id: Date.now() + 32, item: 'Train schedule', checked: false, category: 'travel-documents' },
          { id: Date.now() + 33, item: 'Small blanket', checked: false, category: 'comfort' },
          { id: Date.now() + 34, item: 'Reading material', checked: false, category: 'entertainment' },
          { id: Date.now() + 35, item: 'Headphones', checked: false, category: 'electronics' },
          { id: Date.now() + 36, item: 'Station map', checked: false, category: 'travel-documents' },
          { id: Date.now() + 37, item: 'Reusable shopping bag', checked: false, category: 'accessories' },
          { id: Date.now() + 38, item: 'Portable fan', checked: false, category: 'comfort' },
          { id: Date.now() + 39, item: 'Hand wipes', checked: false, category: 'health' }
        ]);
      } else if (travelMode === 'car') {
        addUniqueItems([
          { id: Date.now() + 40, item: 'Driver\'s license', checked: false, category: 'travel-documents' },
          { id: Date.now() + 41, item: 'Car registration', checked: false, category: 'travel-documents' },
          { id: Date.now() + 42, item: 'Insurance documents', checked: false, category: 'travel-documents' },
          { id: Date.now() + 43, item: 'Car emergency kit', checked: false, category: 'safety' },
          { id: Date.now() + 44, item: 'Jumper cables', checked: false, category: 'car-essentials' },
          { id: Date.now() + 45, item: 'Spare tire', checked: false, category: 'car-essentials' },
          { id: Date.now() + 46, item: 'Tire pressure gauge', checked: false, category: 'car-essentials' },
          { id: Date.now() + 47, item: 'Car phone charger', checked: false, category: 'electronics' },
          { id: Date.now() + 48, item: 'GPS device/maps', checked: false, category: 'navigation' },
          { id: Date.now() + 49, item: 'Flashlight', checked: false, category: 'safety' },
          { id: Date.now() + 50, item: 'Ice scraper (if cold)', checked: false, category: 'car-essentials' },
          { id: Date.now() + 51, item: 'Sunshade (if hot)', checked: false, category: 'car-essentials' },
          { id: Date.now() + 52, item: 'Toll pass/change', checked: false, category: 'car-essentials' },
          { id: Date.now() + 53, item: 'Paper towels', checked: false, category: 'car-essentials' },
          { id: Date.now() + 54, item: 'Plastic bags', checked: false, category: 'car-essentials' }
        ]);
      } else if (travelMode === 'bike') {
        addUniqueItems([
          { id: Date.now() + 60, item: 'Helmet', checked: false, category: 'safety' },
          { id: Date.now() + 61, item: 'Bike repair kit', checked: false, category: 'bike-essentials' },
          { id: Date.now() + 62, item: 'Spare tube', checked: false, category: 'bike-essentials' },
          { id: Date.now() + 63, item: 'Bike pump', checked: false, category: 'bike-essentials' },
          { id: Date.now() + 64, item: 'Bike lock', checked: false, category: 'bike-essentials' },
          { id: Date.now() + 65, item: 'Cycling gloves', checked: false, category: 'clothing' },
          { id: Date.now() + 66, item: 'Padded shorts', checked: false, category: 'clothing' },
          { id: Date.now() + 67, item: 'Reflective gear', checked: false, category: 'safety' },
          { id: Date.now() + 68, item: 'Bike lights', checked: false, category: 'safety' },
          { id: Date.now() + 69, item: 'Cycling shoes', checked: false, category: 'footwear' },
          { id: Date.now() + 70, item: 'Bike multi-tool', checked: false, category: 'bike-essentials' },
          { id: Date.now() + 71, item: 'Energy bars', checked: false, category: 'food' },
          { id: Date.now() + 72, item: 'Electrolyte drinks', checked: false, category: 'food' },
          { id: Date.now() + 73, item: 'Bike bell', checked: false, category: 'bike-essentials' },
          { id: Date.now() + 74, item: 'Cycling map/GPS', checked: false, category: 'navigation' }
        ]);
      }

      if (newItems.length > 0) {
        const updatedList = [...existingList, ...newItems];
        await supabase
          .from('travel_rooms')
          .update({
            packing_list: updatedList,
            last_updated_by: (await supabase.auth.getUser()).data.user.id,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', currentRoom.id);
          
        setPackingList(updatedList);
      }
    } catch (err) {
      console.error('Error updating packing list:', err);
    }
  };

  const getRecommendations = () => {
    if (!weatherData) {
      setError('Please check weather insights first');
      return;
    }
    
    const temp = weatherData.main.temp;
    const weatherCondition = weatherData.weather[0].main.toLowerCase();
    
    let recommendation = '';
    
    if (temp > 30) {
      recommendation = "Extreme heat expected! Avoid outdoor activities during midday, wear light-colored clothing, and drink plenty of water.";
    } else if (temp > 25) {
      recommendation = "Warm weather expected! Great for beach activities and outdoor dining. Don't forget your sunscreen!";
    } else if (temp > 15) {
      recommendation = "Mild temperatures expected. Perfect for sightseeing and outdoor activities.";
    } else if (temp > 5) {
      recommendation = "Cool weather expected. Bring layers for changing temperatures throughout the day.";
    } else {
      recommendation = "Very cold temperatures expected. Limit time outdoors and dress in warm layers.";
    }
    
    if (weatherCondition.includes('rain')) {
      recommendation += " Rain expected - pack waterproof gear and plan indoor activities as backup.";
    } else if (weatherCondition.includes('snow')) {
      recommendation += " Snow expected - check for travel disruptions and pack warm winter gear.";
    }
    
    alert(`Travel Recommendations for ${destination}:\n\n${recommendation}`);
  };

  //to prevent duplications
  const handleCheckItem = async (id) => {
    if (!currentRoom || updatingItem) return;
    setUpdatingItem(true);
    
    try {
      const { data: latestRoom, error: fetchError } = await supabase
        .from('travel_rooms')
        .select('packing_list, last_updated_at')
        .eq('id', currentRoom.id)
        .single();

      if (fetchError) throw fetchError;

      const updatedList = latestRoom.packing_list.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );

      const { error: updateError } = await supabase
        .from('travel_rooms')
        .update({
          packing_list: updatedList,
          last_updated_by: (await supabase.auth.getUser()).data.user.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', currentRoom.id)
        .eq('last_updated_at', latestRoom.last_updated_at);

      if (updateError) {
        const { data: latest } = await supabase
          .from('travel_rooms')
          .select('packing_list')
          .eq('id', currentRoom.id)
          .single();
          
        if (latest?.packing_list) {
          setPackingList(latest.packing_list);
        }
        throw new Error('Concurrent update detected, latest version loaded');
      }

      setPackingList(updatedList);
    } catch (err) {
      console.error('Error updating item:', err);
    } finally {
      setTimeout(() => setUpdatingItem(false), 500); //increased delay to prevent rapid updates
    }
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    
    setPackingList([
      ...packingList,
      { id: Date.now(), item: customItem.trim(), checked: false, category: 'custom' }
    ]);
    setCustomItem('');
  };

  const removeItem = (id) => {
    setPackingList(packingList.filter(item => item.id !== id));
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Travel Plan for ${destination}`, 20, 20);
    
    if (weatherData) {
      doc.setFontSize(14);
      doc.text(`Weather: ${weatherData.weather[0].main} - ${Math.round(weatherData.main.temp)}°C`, 20, 40);
    }
    
    doc.autoTable({
      startY: 60,
      head: [['Item', 'Status']],
      body: packingList.map(item => [
        item.item,
        item.checked ? '✓' : '□'
      ])
    });
    
    doc.save(`travel-plan-${destination}.pdf`);
  };

  const groupByCategory = () => {
    return packingList.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  };

  const categorizedItems = groupByCategory();

  const generateCustomPackingList = async () => {
    if (!destination || !travelMode || !weatherData) return;
    
    setIsGeneratingList(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('health_conditions,weather_sensitivities,allergies')
        .eq('id', user.id)
        .single();

      //generate context-aware packing list
      const basePackingList = getBackupPackingList(travelMode, weatherData.main.temp, destination);
      const updatedList = [...packingList];

      //add health-related items based on user profile
      if (profile?.health_conditions?.length > 0) {
        profile.health_conditions.forEach(condition => {
          const healthItems = getHealthRelatedItems(condition);
          healthItems.forEach(item => {
            if (!packingList.some(existing => existing.item.toLowerCase() === item.item.toLowerCase())) {
              updatedList.push(item);
            }
          });
        });
      }

      //add weather-sensitive items
      if (profile?.weather_sensitivities?.length > 0) {
        profile.weather_sensitivities.forEach(sensitivity => {
          const sensitivityItems = getWeatherSensitivityItems(sensitivity, weatherData);
          sensitivityItems.forEach(item => {
            if (!packingList.some(existing => existing.item.toLowerCase() === item.item.toLowerCase())) {
              updatedList.push(item);
            }
          });
        });
      }

      //add allergy-related items
      if (profile?.allergies?.length > 0) {
        profile.allergies.forEach(allergy => {
          const allergyItems = getAllergyItems(allergy);
          allergyItems.forEach(item => {
            if (!packingList.some(existing => existing.item.toLowerCase() === item.item.toLowerCase())) {
              updatedList.push(item);
            }
          });
        });
      }

      //add destination-specific items
      const destinationItems = getDestinationSpecificItems(destination, weatherData);
      destinationItems.forEach(item => {
        if (!packingList.some(existing => existing.item.toLowerCase() === item.item.toLowerCase())) {
          updatedList.push(item);
        }
      });

      if (currentRoom) {
        await supabase
          .from('travel_rooms')
          .update({
            packing_list: updatedList,
            last_updated_by: user.id,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', currentRoom.id);
      }
      
      setPackingList(updatedList);
    } catch (err) {
      console.error('Error generating packing list:', err);
      setError('Could not generate AI packing list. Using backup list instead.');
      
      const backupItems = getBackupPackingList(travelMode, weatherData.main.temp, destination);
      const updatedList = [...packingList];
      
      backupItems.forEach(newItem => {
        if (!packingList.some(existingItem => 
          existingItem.item.toLowerCase() === newItem.item.toLowerCase()
        )) {
          updatedList.push(newItem);
        }
      });

      setPackingList(updatedList);
    } finally {
      setIsGeneratingList(false);
    }
  };

  const getBackupPackingList = (mode, temperature, destination) => {
    const essentialItems = [
      { id: Date.now(), item: 'Phone charger', checked: false, category: 'electronics' },
      { id: Date.now() + 1, item: 'Power bank', checked: false, category: 'electronics' },
      { id: Date.now() + 2, item: 'Toiletries', checked: false, category: 'essentials' },
      { id: Date.now() + 3, item: 'First aid kit', checked: false, category: 'medical' },
      { id: Date.now() + 4, item: 'Medications', checked: false, category: 'medical' },
      { id: Date.now() + 5, item: 'Hand sanitizer', checked: false, category: 'health' },
      { id: Date.now() + 6, item: 'Face masks', checked: false, category: 'health' },
      { id: Date.now() + 7, item: 'Travel insurance documents', checked: false, category: 'documents' }
    ];

    const transportItems = {
      flight: [
        { id: Date.now() + 10, item: 'Passport', checked: false, category: 'documents' },
        { id: Date.now() + 11, item: 'Boarding pass', checked: false, category: 'documents' },
        { id: Date.now() + 12, item: 'Travel pillow', checked: false, category: 'comfort' },
        { id: Date.now() + 13, item: 'Eye mask', checked: false, category: 'comfort' },
        { id: Date.now() + 14, item: 'Noise-canceling headphones', checked: false, category: 'electronics' },
        { id: Date.now() + 15, item: 'Entertainment device', checked: false, category: 'electronics' },
        { id: Date.now() + 16, item: 'Compression socks', checked: false, category: 'clothing' },
        { id: Date.now() + 17, item: 'TSA-approved toiletries', checked: false, category: 'essentials' }
      ],
      train: [
        { id: Date.now() + 20, item: 'Train ticket', checked: false, category: 'documents' },
        { id: Date.now() + 21, item: 'ID card', checked: false, category: 'documents' },
        { id: Date.now() + 22, item: 'Books/magazines', checked: false, category: 'entertainment' },
        { id: Date.now() + 23, item: 'Headphones', checked: false, category: 'electronics' },
        { id: Date.now() + 24, item: 'Snacks', checked: false, category: 'food' },
        { id: Date.now() + 25, item: 'Water bottle', checked: false, category: 'essentials' },
        { id: Date.now() + 26, item: 'Light blanket', checked: false, category: 'comfort' },
        { id: Date.now() + 27, item: 'Travel pillow', checked: false, category: 'comfort' }
      ],
      car: [
        { id: Date.now() + 30, item: 'Driver\'s license', checked: false, category: 'documents' },
        { id: Date.now() + 31, item: 'Car insurance', checked: false, category: 'documents' },
        { id: Date.now() + 32, item: 'Vehicle registration', checked: false, category: 'documents' },
        { id: Date.now() + 33, item: 'Car emergency kit', checked: false, category: 'safety' },
        { id: Date.now() + 34, item: 'Phone mount', checked: false, category: 'accessories' },
        { id: Date.now() + 35, item: 'Car charger', checked: false, category: 'electronics' },
        { id: Date.now() + 36, item: 'Snacks and water', checked: false, category: 'food' },
        { id: Date.now() + 37, item: 'Paper maps/GPS', checked: false, category: 'navigation' }
      ],
      bike: [
        { id: Date.now() + 40, item: 'Helmet', checked: false, category: 'safety' },
        { id: Date.now() + 41, item: 'Bike repair kit', checked: false, category: 'tools' },
        { id: Date.now() + 42, item: 'Bike lock', checked: false, category: 'safety' },
        { id: Date.now() + 43, item: 'Water bottles', checked: false, category: 'essentials' },
        { id: Date.now() + 44, item: 'Cycling gloves', checked: false, category: 'accessories' },
        { id: Date.now() + 45, item: 'Bike lights', checked: false, category: 'safety' },
        { id: Date.now() + 46, item: 'Cycling shorts', checked: false, category: 'clothing' },
        { id: Date.now() + 47, item: 'High-visibility gear', checked: false, category: 'safety' }
      ]
    };

    const weatherItems = temperature > 25 ? [
      { id: Date.now() + 50, item: 'Sunscreen', checked: false, category: 'health' },
      { id: Date.now() + 51, item: 'Sunglasses', checked: false, category: 'accessories' },
      { id: Date.now() + 52, item: 'Sun hat', checked: false, category: 'accessories' },
      { id: Date.now() + 53, item: 'Light clothing', checked: false, category: 'clothing' },
      { id: Date.now() + 54, item: 'Swimming gear', checked: false, category: 'clothing' },
      { id: Date.now() + 55, item: 'After-sun cream', checked: false, category: 'health' }
    ] : [
      { id: Date.now() + 60, item: 'Warm jacket', checked: false, category: 'clothing' },
      { id: Date.now() + 61, item: 'Gloves', checked: false, category: 'accessories' },
      { id: Date.now() + 62, item: 'Winter hat', checked: false, category: 'accessories' },
      { id: Date.now() + 63, item: 'Scarf', checked: false, category: 'accessories' },
      { id: Date.now() + 64, item: 'Thermal underwear', checked: false, category: 'clothing' },
      { id: Date.now() + 65, item: 'Warm socks', checked: false, category: 'clothing' }
    ];

    return [...essentialItems, ...transportItems[mode], ...weatherItems];
  };

  //AI generation button to the UI
  const renderPackingListHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6" sx={{ color: '#2980b9' }}>
        Your Packing List
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2">
          {packingList.filter(item => item.checked).length} of {packingList.length} packed
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={generateCustomPackingList}
          disabled={isGeneratingList || !destination || !weatherData}
          startIcon={<span>🤖</span>}
          size="small"
        >
          {isGeneratingList ? 'Generating...' : 'Get AI Suggestions'}
        </Button>
      </Box>
    </Box>
  );

  const getHealthRelatedItems = (condition) => {
    const healthItems = {
      'Asthma': [
        { id: Date.now() + Math.random(), item: 'Inhaler', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Spacer', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Peak flow meter', checked: false, category: 'medical' }
      ],
      'Allergies': [
        { id: Date.now() + Math.random(), item: 'Antihistamines', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'EpiPen if prescribed', checked: false, category: 'medical' }
      ],
      'Diabetes': [
        { id: Date.now() + Math.random(), item: 'Blood glucose meter', checked: false, category: 'medical' }, //create unique id
        { id: Date.now() + Math.random(), item: 'Test strips', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Insulin and supplies', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Glucose tablets', checked: false, category: 'medical' }
      ],
      'Heart Condition': [
        { id: Date.now() + Math.random(), item: 'Heart medication', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Blood pressure monitor', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Medical ID bracelet', checked: false, category: 'medical' }
      ]
    };
    return healthItems[condition] || [];
  };

  const getWeatherSensitivityItems = (sensitivity, weather) => {
    const temp = weather.main.temp;
    const items = [];

    switch(sensitivity) {
      case 'Heat':
        if (temp > 25) {
          items.push(
            { id: Date.now() + Math.random(), item: 'Cooling towel', checked: false, category: 'health' },
            { id: Date.now() + Math.random(), item: 'Portable fan', checked: false, category: 'comfort' },
            { id: Date.now() + Math.random(), item: 'Electrolyte packets', checked: false, category: 'health' }
          );
        }
        break;
      case 'Cold':
        if (temp < 15) {
          items.push(
            { id: Date.now() + Math.random(), item: 'Hand warmers', checked: false, category: 'comfort' },
            { id: Date.now() + Math.random(), item: 'Thermal layers', checked: false, category: 'clothing' },
            { id: Date.now() + Math.random(), item: 'Insulated boots', checked: false, category: 'footwear' }
          );
        }
        break;
      case 'Humidity':
        if (weather.main.humidity > 70) {
          items.push(
            { id: Date.now() + Math.random(), item: 'Anti-humidity hair products', checked: false, category: 'toiletries' },
            { id: Date.now() + Math.random(), item: 'Moisture-wicking clothes', checked: false, category: 'clothing' }
          );
        }
        break;
      case 'Air Quality':
        items.push(
          { id: Date.now() + Math.random(), item: 'Face mask', checked: false, category: 'health' },
          { id: Date.now() + Math.random(), item: 'Portable air purifier', checked: false, category: 'health' }
        );
        break;
      case 'Pollen':
        items.push(
          { id: Date.now() + Math.random(), item: 'Allergy medication', checked: false, category: 'medical' },
          { id: Date.now() + Math.random(), item: 'Nasal spray', checked: false, category: 'medical' }
        );
        break;
    }
    return items;
  };

  const getAllergyItems = (allergy) => {
    const allergyItems = {
      'Pollen': [
        { id: Date.now() + Math.random(), item: 'Air purifying mask', checked: false, category: 'health' },
        { id: Date.now() + Math.random(), item: 'Antihistamine nasal spray', checked: false, category: 'medical' }
      ],
      'Dust': [
        { id: Date.now() + Math.random(), item: 'Dust mask', checked: false, category: 'health' },
        { id: Date.now() + Math.random(), item: 'Hypoallergenic pillow cover', checked: false, category: 'bedding' }
      ],
      'Food': [
        { id: Date.now() + Math.random(), item: 'Epinephrine auto-injector', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Food allergy card', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'Safe snacks', checked: false, category: 'food' }
      ],
      'Medication': [
        { id: Date.now() + Math.random(), item: 'Medical alert bracelet', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'List of allergies', checked: false, category: 'medical' }
      ],
      'Insect': [
        { id: Date.now() + Math.random(), item: 'Insect repellent', checked: false, category: 'health' },
        { id: Date.now() + Math.random(), item: 'Bite treatment cream', checked: false, category: 'medical' },
        { id: Date.now() + Math.random(), item: 'EpiPen if prescribed', checked: false, category: 'medical' }
      ]
    };
    return allergyItems[allergy] || [];
  };

  const getDestinationSpecificItems = (destination, weather) => {
    const items = [];
    const lowercaseDest = destination.toLowerCase();

    if (lowercaseDest.includes('beach') || 
        lowercaseDest.includes('coast') || 
        lowercaseDest.includes('island')) {
      items.push(
        { id: Date.now() + Math.random(), item: 'Beach towel', checked: false, category: 'beach' },
        { id: Date.now() + Math.random(), item: 'Swimwear', checked: false, category: 'clothing' },
        { id: Date.now() + Math.random(), item: 'Beach umbrella', checked: false, category: 'beach' },
        { id: Date.now() + Math.random(), item: 'Waterproof phone case', checked: false, category: 'accessories' }
      );
    }

    if (lowercaseDest.includes('mountain') || 
        lowercaseDest.includes('hill') || 
        lowercaseDest.includes('trek')) {
      items.push(
        { id: Date.now() + Math.random(), item: 'Hiking boots', checked: false, category: 'footwear' },
        { id: Date.now() + Math.random(), item: 'Walking poles', checked: false, category: 'equipment' },
        { id: Date.now() + Math.random(), item: 'Trail map', checked: false, category: 'navigation' },
        { id: Date.now() + Math.random(), item: 'First aid kit', checked: false, category: 'safety' }
      );
    }

    if (lowercaseDest.includes('city') || 
        lowercaseDest.includes('town') || 
        lowercaseDest.includes('burg')) {
      items.push(
        { id: Date.now() + Math.random(), item: 'City map', checked: false, category: 'navigation' },
        { id: Date.now() + Math.random(), item: 'Comfortable walking shoes', checked: false, category: 'footwear' },
        { id: Date.now() + Math.random(), item: 'Day bag', checked: false, category: 'accessories' },
        { id: Date.now() + Math.random(), item: 'Transit card/pass', checked: false, category: 'transportation' }
      );
    }

    if (weather.main.temp > 25) {
      items.push(
        { id: Date.now() + Math.random(), item: 'Sun protection', checked: false, category: 'health' },
        { id: Date.now() + Math.random(), item: 'Light clothing', checked: false, category: 'clothing' }
      );
    } else if (weather.main.temp < 10) {
      items.push(
        { id: Date.now() + Math.random(), item: 'Winter coat', checked: false, category: 'clothing' },
        { id: Date.now() + Math.random(), item: 'Thermal layers', checked: false, category: 'clothing' }
      );
    }

    if (weather.weather[0].main.toLowerCase().includes('rain')) {
      items.push(
        { id: Date.now() + Math.random(), item: 'Rain jacket', checked: false, category: 'clothing' },
        { id: Date.now() + Math.random(), item: 'Umbrella', checked: false, category: 'accessories' },
        { id: Date.now() + Math.random(), item: 'Waterproof shoes', checked: false, category: 'footwear' }
      );
    }

    return items;
  };

  useEffect(() => {
    const loadSpecificRoom = async () => {
      if (!roomId) return;
      
      try {
        const { data: room, error } = await supabase
          .from('travel_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (error) throw error;
        if (room) {
          await handleJoinRoom(room);
        }
      } catch (err) {
        console.error('Error loading specific room:', err);
        setError(err.message);
      }
    };

    loadSpecificRoom();
  }, [roomId]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold', textAlign: 'center' }}>
          WeatherMind AI Travel Planner
        </Typography>

        {/* Room Management Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2980b9' }}>
            Travel Rooms
          </Typography>

          {currentRoom ? (
            <Box>
              <Typography variant="subtitle1">
                Current Room: {currentRoom.name} (Code: {currentRoom.code})
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Members:</Typography>
                <List dense>
                  {roomMembers.map((member) => (
                    <ListItem key={member.user_id}>
                      <ListItemText 
                        primary={member.profiles.full_name}
                        secondary={member.role}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={handleLeaveRoom}
                  sx={{ mt: 1 }}
                >
                  Leave Room
                </Button>
                {roomMembers.some(member => 
                  member.user_id === (window.supabase?.auth?.user()?.id || '') && 
                  member.role === 'admin'
                ) && (
                  <Button 
                    variant="contained" 
                    color="error" 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
                        handleDeleteRoom();
                      }
                    }}
                    sx={{ mt: 1 }}
                  >
                    Delete Room
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => setShowCreateRoom(true)}
              >
                Create Room
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setShowJoinRoom(true)}
              >
                Join Room
              </Button>
            </Box>
          )}
        </Paper>

        <Dialog open={showCreateRoom} onClose={() => setShowCreateRoom(false)}>
          <DialogTitle>Create Travel Room</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Room Name"
              fullWidth
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateRoom(false)}>Cancel</Button>
            <Button onClick={handleCreateRoom} disabled={!roomName.trim()}>
              Create
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showJoinRoom} onClose={handleCloseJoinDialog}>
          <DialogTitle>Join Travel Room</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Room Code"
              fullWidth
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <Button 
              variant="outlined" 
              onClick={handlePreviewRoom}
              disabled={!roomCode.trim() || previewLoading}
              sx={{ mt: 2 }}
            >
              {previewLoading ? 'Loading...' : 'Preview Room'}
            </Button>
            {roomPreview && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Room Name: {roomPreview.name}</Typography>
                <Typography variant="subtitle2">Destination: {roomPreview.destination}</Typography>
                <Typography variant="subtitle2">Travel Mode: {roomPreview.travel_mode}</Typography>
                <Typography variant="subtitle2">Members:</Typography>
                <List dense>
                  {roomPreview.room_members.map((member) => (
                    <ListItem key={member.user_id}>
                      <ListItemText 
                        primary={member.profiles.full_name}
                        secondary={member.role}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseJoinDialog}>Cancel</Button>
            <Button onClick={handleJoinRoom} disabled={!roomCode.trim()}>
              Join
            </Button>
          </DialogActions>
        </Dialog>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2980b9' }}>
            Trip Details
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              label="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              fullWidth
              sx={{ flex: 1, minWidth: 200 }}
              placeholder="e.g., Paris, London, New York"
            />
            
            <FormControl sx={{ minWidth: 120 }}>
              <Select
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value)}
              >
                <MenuItem value="flight"> Flight</MenuItem>
                <MenuItem value="car"> Car</MenuItem>
                <MenuItem value="train"> Train</MenuItem>
                <MenuItem value="bike"> Bike</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              minDate={startDate}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={fetchWeatherData}
              disabled={loading}
              sx={{ flex: 1, py: 1.5 }}
              startIcon={<span>🌤️</span>}
            >
              {loading ? 'Loading...' : 'Check Weather'}
            </Button>
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={getRecommendations}
              disabled={!weatherData}
              sx={{ flex: 1, py: 1.5 }}
              startIcon={<span>💡</span>}
            >
              Get Recommendations
            </Button>
          </Box>
        </Paper>
        
        {loading && <LinearProgress sx={{ mb: 3 }} />}
        
        {weatherData && (
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#2980b9' }}>
                Weather Forecast for {weatherData.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getWeatherIcon(weatherData.weather[0].main)}
                <Typography variant="h5" sx={{ ml: 1 }}>
                  {Math.round(weatherData.main.temp)}°C
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Chip 
                label={`Feels like: ${Math.round(weatherData.main.feels_like)}°C`} 
                variant="outlined" 
                color="primary" 
              />
              <Chip 
                label={`Humidity: ${weatherData.main.humidity}%`} 
                variant="outlined" 
                color="primary" 
              />
              <Chip 
                label={`Wind: ${weatherData.wind.speed} m/s`} 
                variant="outlined" 
                color="primary" 
              />
              <Chip 
                label={weatherData.weather[0].description} 
                variant="outlined" 
                color="primary" 
              />
            </Box>
            
            <Typography>
              {weatherData.main.temp > 25
                ? "It's going to be warm! Pack light clothing, sunscreen, and stay hydrated."
                : "It's going to be cool! Bring layers and warm clothing."}
              {weatherData.weather[0].main.toLowerCase().includes('rain') && 
                " Don't forget your rain gear!"}
              {weatherData.weather[0].main.toLowerCase().includes('snow') && 
                " Winter gear is essential for this trip!"}
            </Typography>
          </Paper>
        )}

        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          {renderPackingListHeader()}
          
          {Object.entries(categorizedItems).map(([category, items]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#555' }}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Typography>
              {items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Checkbox
                    checked={item.checked}
                    onChange={() => handleCheckItem(item.id)}
                    color="primary"
                  />
                  <Typography sx={{ flexGrow: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>
                    {item.item}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => removeItem(item.id)}
                    sx={{ color: 'error.main' }}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          ))}
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Add custom item"
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              fullWidth
              size="small"
              onKeyPress={(e) => e.key === 'Enter' && addCustomItem()}
            />
            <Button 
              variant="outlined" 
              onClick={addCustomItem}
              disabled={!customItem.trim()}
            >
              Add Item
            </Button>
          </Box>
          
          <Button 
            variant="contained" 
            onClick={downloadPDF}
            color="success"
            fullWidth
            size="large"
            startIcon={<span>📄</span>}
          >
            Download Travel Plan as PDF
          </Button>
        </Paper>

        {currentRoom && (
          <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveTravel}
                disabled={isSaving}
                startIcon={<span>💾</span>}
              >
                {isSaving ? 'Saving...' : 'Save Travel Details'}
              </Button>
              {roomMembers.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {roomMembers.find(m => m.user_id === currentRoom.last_updated_by)?.profiles?.full_name 
                    ? `Last updated by ${roomMembers.find(m => m.user_id === currentRoom.last_updated_by)?.profiles?.full_name}`
                    : 'Collaborative editing enabled'}
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default TravelPlanner;