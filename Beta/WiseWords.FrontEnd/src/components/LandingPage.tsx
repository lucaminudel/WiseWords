import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleEnterForum = () => {
    navigate('/conversations');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="app-title">
          <div className="title-word">
            <span className="big-w">W</span>
            <span className="small-letters">ISE</span>
          </div>
          <div className="title-word">
            <span className="big-w accent">W</span>
            <span className="small-letters">ORDS</span>
          </div>
        </div>
        
        <p className="app-description">
          <br/>
          All social networks are good to share news, opinions, statements.
          <br/><br/>
          Wise Words gets you from questions to <span className="highlight">answers</span>, problems to <span className="highlight">solutions</span>, and dilemmas to <span className="highlight">options</span>.
          Enabling productive collaborative conversations.
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
