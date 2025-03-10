import React from 'react';
import ReactDOM from 'react-dom';
import { LocalGameComponent, AIGameComponent } from './game/CozenClient';

// Basic app component
const App = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Cozen - Boardgame.io Implementation</h1>
      <p>Select a game mode below to get started:</p>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
        <div style={{ margin: '0 20px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h2>Local Game</h2>
          <p>Play locally with two players sharing the same screen</p>
          <LocalGameComponent />
        </div>
        
        <div style={{ margin: '0 20px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h2>Play Against AI</h2>
          <p>Challenge the AI to a game of Cozen</p>
          <AIGameComponent />
        </div>
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));