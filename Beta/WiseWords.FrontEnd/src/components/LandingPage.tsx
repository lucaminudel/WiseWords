import React from 'react';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
  const handleEnterForum = () => {
    // TODO: Navigate to forum page when implemented
    console.log('Navigate to forum');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="app-title">
          <span className="title-word">
            <span className="big-w">W</span>
            <span className="small-letters">ISE</span>
          </span>
          <span style={{ width: '1.2rem', display: 'inline-block' }} />
          <span className="title-word">
            <span className="big-w">W</span>
            <span className="small-letters">ORDS</span>
          </span>
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
