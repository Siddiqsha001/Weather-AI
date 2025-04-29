import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaRobot, FaCalendarAlt, FaUser } from 'react-icons/fa';
import { supabase } from '../services/api';
import '../styles/Navbar.css';
import { Flight as FlightIcon } from '@mui/icons-material';

const Navbar = ({ session }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/dashboard" className="logo-link">
          <span className="logo-text">WeatherMind</span>
          <span className="logo-ai">AI</span>
        </NavLink>
      </div>
      
      <ul className="navbar-nav">
        <li className="nav-item">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => 
              isActive ? "nav-link active" : "nav-link"
            }
            end
          >
            <FaHome className="nav-icon" />
            <span className="nav-text">Dashboard</span>
          </NavLink>
        </li>
        
        <li className="nav-item">
          <NavLink 
            to="/chat" 
            className={({ isActive }) => 
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaRobot className="nav-icon" />
            <span className="nav-text">AI Chat</span>
          </NavLink>
        </li>
        
        <li className="nav-item">
          <NavLink 
            to="/calendar" 
            className={({ isActive }) => 
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaCalendarAlt className="nav-icon" />
            <span className="nav-text">Calendar</span>
          </NavLink>
        </li>
        
        <li className="nav-item">
          <NavLink 
            to="/profile" 
            className={({ isActive }) => 
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaUser className="nav-icon" />
            <span className="nav-text">Profile</span>
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink 
            to="/travel-planner" 
            className={({ isActive }) => 
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FlightIcon className="nav-icon" />
            <span className="nav-text">Travel Planner</span>
          </NavLink>
        </li>
      </ul>
      
      <div className="navbar-actions">
        {session ? (
          <button className="logout-btn" onClick={handleLogout}>
            <span>Logout</span>
          </button>
        ) : (
          <NavLink to="/login" className="login-btn">
            <span>Login</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default Navbar;