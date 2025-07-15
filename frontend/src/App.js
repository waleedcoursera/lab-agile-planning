import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './App.css';

// Import components
import HomePage from './components/HomePage';
import CardBrowser from './components/CardBrowser';
import DeckBuilder from './components/DeckBuilder';
import GameBoard from './components/GameBoard';
import PlayerProfile from './components/PlayerProfile';
import MultiplayerLobby from './components/MultiplayerLobby';
import Navbar from './components/Navbar';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <div className="App min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cards" element={<CardBrowser />} />
            <Route path="/deck-builder" element={<DeckBuilder />} />
            <Route path="/game/:gameId" element={<GameBoard />} />
            <Route path="/profile/:playerId" element={<PlayerProfile />} />
            <Route path="/multiplayer" element={<MultiplayerLobby />} />
          </Routes>
        </div>
      </Router>
    </DndProvider>
  );
}

export default App;