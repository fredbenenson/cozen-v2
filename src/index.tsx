import React from 'react';
import ReactDOM from 'react-dom';
import { LocalGameComponent, AIGameComponent } from './game/CozenClient';

// Basic app component
const App = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ 
        textAlign: 'center', 
        color: '#333',
        borderBottom: '2px solid #ddd',
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        Cozen - Card Game
      </h1>
      
      {/* Directly start the game against AI */}
      <AIGameComponent />
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));