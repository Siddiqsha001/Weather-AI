import React, { useState } from 'react';
import { FaGithub, FaTwitter, FaLinkedin, FaRegEnvelope, FaCheck } from 'react-icons/fa';
import { IoMdPartlySunny } from 'react-icons/io';
import { BsDropletHalf, BsHeartPulse } from 'react-icons/bs';
import '../styles/Footer.css';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    try {
      // In production, replace this with actual API call to your backend
      console.log('Subscribing email:', email);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubscribed(true);
      setEmail('');
      
      // Reset subscription message after 3 seconds
      setTimeout(() => setIsSubscribed(false), 3000);
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <IoMdPartlySunny className="weather-icon" />
            <BsHeartPulse className="health-icon" />
          </div>
          <h3>WeatherMind AI</h3>
          <p>Your personalized health & weather companion</p>
        </div>

        <div className="footer-links">
          <div className="link-column">
            <h4>Product</h4>
            <ul>
              <li><a href="/features">Features</a></li>
              <li><a href="/pricing">Pricing</a></li>
              <li><a href="/updates">Updates</a></li>
            </ul>
          </div>
          
          <div className="link-column">
            <h4>Resources</h4>
            <ul>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/docs">Documentation</a></li>
              <li><a href="/support">Support</a></li>
            </ul>
          </div>
          
          <div className="link-column">
            <h4>Company</h4>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="/careers">Careers</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-cta">
          <h4>Stay Updated</h4>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input 
              type="email" 
              placeholder="Your email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isSubscribed}
            />
            <button 
              type="submit"
              disabled={isLoading || isSubscribed}
              className={isSubscribed ? 'subscribed' : ''}
            >
              {isLoading ? (
                'Sending...'
              ) : isSubscribed ? (
                <>
                  <FaCheck /> Subscribed!
                </>
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
          <div className="social-links">
            <a 
              href="https://github.com/Siddiqsha001" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="GitHub"
            >
              <FaGithub />
            </a>
            <a 
              href="https://x.com/asiddiqsha84195?s=21" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Twitter"
            >
              <FaTwitter />
            </a>
            <a 
              href="https://www.linkedin.com/in/siddiqsha-a-234514283/" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="LinkedIn"
            >
              <FaLinkedin />
            </a>
            <a 
              href="mailto:siddianand2005@gmail.com" 
              aria-label="Email"
            >
              <FaRegEnvelope />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} WeatherMind AI. All rights reserved.</span>
          <div className="legal-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/cookies">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;