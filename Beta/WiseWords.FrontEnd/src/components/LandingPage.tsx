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
