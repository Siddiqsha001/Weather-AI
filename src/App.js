import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/api';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Auth from './components/Auth';
import Profile from './components/Profile';
import Calendar from './components/Calendar';
import Chat from './components/Chat';
import Footer from './components/Footer';
import TravelPlanner from './components/TravelPlanner';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { CssBaseline } from '@mui/material';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }); //checks for existing session

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []); //prevents memory leaks

  return (
    <ThemeProvider> 
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <div className="App">
          <Router>
            <div className="app">
              {session && <Navbar session={session} />}
              <main className="content">
                <Routes>
                  <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
                  <Route path="/dashboard" element={<><Header /><Dashboard /></>} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/login" element={!session ? <Auth /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/travel-planner" element={<TravelPlanner />} />
                  <Route path="/travel-planner/:roomId" element={<TravelPlanner />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
