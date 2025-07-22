import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';
import { Logo } from './Logo';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleEnterForum = () => {
    navigate('/conversations');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="app-title">
          <Logo />
        </div>
        
        <p className="app-description">
          <br/>
          All social networks are good to share news, opinions and statements.
          <br/><br/>
          Wise Words is the place for productive collaborative conversations for finding <span className="highlight">answers</span> to difficult questions, exploring <span className="highlight">solutions</span> to intractable problems, and discussing dilemmas to find suitable <span className="highlight">options</span>.
        </p>
        
        <button 
          className="enter-forum-button"
          onClick={handleEnterForum}
        >
          Enter
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
