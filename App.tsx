import React from 'react';
import Game from './components/Game';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-gradient-to-br from-blue-900 to-black flex items-center justify-center font-sans">
      <Game />
    </div>
  );
};

export default App;