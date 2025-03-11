import React from 'react';
import ReactDOM from 'react-dom';
import { LocalGameComponent, AIGameComponent } from './game/CozenClient';

// Simple error fallback
const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
  return (
    <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
      <h2>Something went wrong:</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button 
        onClick={resetErrorBoundary}
        style={{ padding: '8px 16px', marginTop: '20px', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  );
};

// Simple error boundary implementation
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetErrorBoundary={() => this.setState({ hasError: false, error: null })} 
        />
      );
    }

    return this.props.children;
  }
}

// Basic app component
const App = () => {
  return (
    <SimpleErrorBoundary>
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
    </SimpleErrorBoundary>
  );
};

// Render the app with error handling
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.render(<App />, rootElement);
} else {
  console.error('Root element not found');
}