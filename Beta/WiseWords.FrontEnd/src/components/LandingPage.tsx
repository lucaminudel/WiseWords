import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleEnterForum = () => {
    if (window.location.hostname === 'wise-words.online') {
      window.location.href = 'https://www.wise-words.online/conversations';
    } else {
      navigate('/conversations');
    }
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
          A calm forum to facilitate productive conversations &amp; meaningful conclusions.
          <br/><br/>
          It seamlessly gets you + your team <br/>
          from questions to <span className="highlight">answers</span>, problems to <span className="highlight">solutions</span>, and dilemmas to <span className="highlight">choices</span>.
          <br/><br/>
          <span className="highlight">Invite</span> the right people, <span className="highlight">refine</span> the original goal gradually, and easily <span className="highlight">export</span> the conversation.</p>        
        <button 
          className="enter-forum-button"
          onClick={handleEnterForum}
        >
          Enter
        </button>
        <span className="contact-us-note">Contact us <a href="https://www.smharter.com/index.html#contacts">here</a></span>
      </div>
    </div>
  );
};

export default LandingPage;
