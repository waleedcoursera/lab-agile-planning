import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import axios from 'axios';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const terrainColors = {
  normal: 'bg-gray-400',
  forest: 'bg-green-500',
  meadow: 'bg-green-300',
  mountain: 'bg-gray-600',
  sea: 'bg-blue-500',
  wasteland: 'bg-yellow-600',
  darkness: 'bg-purple-800',
  toon: 'bg-pink-400',
  crush: 'bg-red-600',
  labyrinth: 'bg-indigo-700'
};

const terrainNames = {
  normal: 'عادي',
  forest: 'غابة',
  meadow: 'مرج',
  mountain: 'جبل',
  sea: 'بحر',
  wasteland: 'أرض قاحلة',
  darkness: 'ظلام',
  toon: 'كرتون',
  crush: 'تدمير',
  labyrinth: 'متاهة'
};

const DraggableFieldCard = ({ card, onMove, onAttack, gameState, currentPlayer }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'fieldCard',
    item: { card },
    canDrag: card.owner_id === currentPlayer && card.can_move,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleAttack = () => {
    if (card.owner_id === currentPlayer && card.can_attack) {
      onAttack(card);
    }
  };

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      className={`absolute inset-0 flex items-center justify-center ${
        card.owner_id === currentPlayer ? 'cursor-move' : 'cursor-pointer'
      }`}
      onClick={handleAttack}
    >
      <div className={`w-12 h-16 rounded-lg flex items-center justify-center text-xs font-bold ${
        card.is_deck_leader 
          ? 'bg-yellow-400 text-purple-900 border-2 border-yellow-600' 
          : card.owner_id === currentPlayer 
            ? 'bg-blue-600 text-white border-2 border-blue-800' 
            : 'bg-red-600 text-white border-2 border-red-800'
      }`}>
        <div className="text-center">
          <div className="text-xs truncate">{card.name || 'Card'}</div>
          {card.is_deck_leader && <div className="text-xs">👑</div>}
          <div className="text-xs">{card.current_attack}</div>
        </div>
      </div>
    </motion.div>
  );
};

const GameCell = ({ x, y, terrain, card, onCardDrop, onCellClick, gameState, currentPlayer }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['handCard', 'fieldCard'],
    drop: (item) => {
      if (item.type === 'handCard') {
        onCardDrop(item.card, x, y);
      } else if (item.type === 'fieldCard') {
        onCardDrop(item.card, x, y, true);
      }
    },
    canDrop: (item) => {
      // Check if position is empty
      if (card) return false;
      
      // Additional validation can be added here
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`relative w-16 h-16 border border-gray-600 ${terrainColors[terrain]} ${
        isOver ? canDrop ? 'ring-2 ring-green-400' : 'ring-2 ring-red-400' : ''
      }`}
      onClick={() => onCellClick(x, y)}
    >
      {card && (
        <DraggableFieldCard
          card={card}
          gameState={gameState}
          currentPlayer={currentPlayer}
        />
      )}
      
      {/* Terrain indicator */}
      <div className="absolute top-0 left-0 w-3 h-3 bg-black bg-opacity-50 text-white text-xs flex items-center justify-center">
        {terrain.charAt(0).toUpperCase()}
      </div>
    </div>
  );
};

const HandCard = ({ card, onPlay, canPlay }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'handCard',
    item: { card, type: 'handCard' },
    canDrag: canPlay,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      className={`bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 ${
        canPlay ? 'cursor-move hover:bg-opacity-20' : 'cursor-not-allowed opacity-50'
      }`}
      onClick={() => canPlay && onPlay(card)}
    >
      <div className="text-center">
        <div className="w-16 h-20 bg-gray-700 rounded mb-2 flex items-center justify-center">
          <img
            src={card.image_url || 'https://via.placeholder.com/64x80?text=Card'}
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
        </div>
        <div className="text-xs text-white font-semibold truncate">
          {card.name}
        </div>
        <div className="text-xs text-yellow-400">
          {card.deck_cost}
        </div>
        {card.card_type === 'monster' && (
          <div className="text-xs text-gray-300">
            {card.attack}/{card.defense}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const GameBoard = () => {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [validActions, setValidActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [attackMode, setAttackMode] = useState(false);
  const [socket, setSocket] = useState(null);
  const [gameMessage, setGameMessage] = useState('');
  const [currentPlayer] = useState('player1'); // In a real app, this would be dynamic

  useEffect(() => {
    if (gameId === 'new-single') {
      createNewGame();
    } else {
      fetchGameState();
    }
    
    // Initialize WebSocket for multiplayer
    const socketConnection = io(BACKEND_URL);
    setSocket(socketConnection);
    
    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [gameId]);

  const createNewGame = async () => {
    try {
      const response = await axios.post(`${API}/games`, {
        player1_id: 'player1',
        player2_id: 'ai',
        is_multiplayer: false
      });
      
      setGameState(response.data.game_state);
      setPlayerHand(response.data.player_hand);
      setValidActions(response.data.available_actions);
      setGameMessage(response.data.message);
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameState = async () => {
    try {
      const response = await axios.get(`${API}/games/${gameId}?player_id=${currentPlayer}`);
      setGameState(response.data.game_state);
      setPlayerHand(response.data.player_hand);
      setValidActions(response.data.available_actions);
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionType, actionData) => {
    try {
      const response = await axios.post(`${API}/games/${gameState.id}/actions`, {
        player_id: currentPlayer,
        action_type: actionType,
        ...actionData
      });
      
      if (response.data.success) {
        // Refresh game state
        fetchGameState();
        setGameMessage(response.data.message || 'Action executed successfully');
        
        // Handle AI turn if it's single player
        if (!gameState.is_multiplayer && actionType === 'end_turn') {
          setTimeout(() => {
            handleAITurn();
          }, 2000);
        }
      } else {
        setGameMessage(response.data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      setGameMessage('Error executing action');
    }
  };

  const handleAITurn = async () => {
    try {
      const response = await axios.post(`${API}/ai/move`, {
        game_id: gameState.id,
        ai_player_id: 'ai'
      });
      
      if (response.data.action) {
        setGameMessage(`AI executed: ${response.data.action}`);
        fetchGameState();
      }
    } catch (error) {
      console.error('Error with AI turn:', error);
    }
  };

  const handleCardDrop = (card, x, y, isMove = false) => {
    if (isMove) {
      // Moving existing card
      executeAction('move', {
        card_id: card.id,
        position: { x, y }
      });
    } else {
      // Summoning new card
      executeAction('summon', {
        card_id: card.id,
        position: { x, y }
      });
    }
  };

  const handleCellClick = (x, y) => {
    if (selectedCard) {
      handleCardDrop(selectedCard, x, y);
      setSelectedCard(null);
    }
  };

  const handleCardPlay = (card) => {
    setSelectedCard(card);
    setGameMessage(`Select a position to place ${card.name}`);
  };

  const handleAttack = (attackerCard) => {
    setAttackMode(true);
    setSelectedCard(attackerCard);
    setGameMessage(`Select a target to attack with ${attackerCard.name}`);
  };

  const handleEndTurn = () => {
    executeAction('end_turn', {});
    setAttackMode(false);
    setSelectedCard(null);
  };

  const getCardAtPosition = (x, y) => {
    return gameState?.field.cards.find(card => 
      card.position.x === x && card.position.y === y
    );
  };

  const isMyTurn = () => {
    return gameState?.current_turn === currentPlayer;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Game not found</h2>
          <p>The game you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Game Header */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <div className="text-lg font-bold">Turn: {gameState.turn_number}</div>
                <div className="text-sm">
                  {isMyTurn() ? 'Your Turn' : "Opponent's Turn"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-yellow-400 font-bold">You</div>
                <div className="text-white text-lg">{gameState.player1_lp} LP</div>
              </div>
              
              <div className="text-center">
                <div className="text-red-400 font-bold">Opponent</div>
                <div className="text-white text-lg">{gameState.player2_lp} LP</div>
              </div>
            </div>
          </div>
          
          {gameMessage && (
            <div className="mt-2 text-center text-yellow-400">
              {gameMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <h2 className="text-xl font-bold text-yellow-400 mb-4 text-center">
                Duel Field
              </h2>
              
              <div className="flex justify-center">
                <div className="grid grid-cols-7 gap-1 bg-gray-800 p-2 rounded-lg">
                  {gameState.field.terrain.map((row, y) =>
                    row.map((terrain, x) => (
                      <GameCell
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        terrain={terrain}
                        card={getCardAtPosition(x, y)}
                        onCardDrop={handleCardDrop}
                        onCellClick={handleCellClick}
                        gameState={gameState}
                        currentPlayer={currentPlayer}
                      />
                    ))
                  )}
                </div>
              </div>
              
              {/* Terrain Legend */}
              <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
                {Object.entries(terrainNames).map(([key, name]) => (
                  <div key={key} className="flex items-center space-x-1">
                    <div className={`w-3 h-3 rounded ${terrainColors[key]}`}></div>
                    <span className="text-gray-300">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Player Hand */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Your Hand ({playerHand.length})
              </h3>
              
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {playerHand.map((card) => (
                  <HandCard
                    key={card.id}
                    card={card}
                    onPlay={handleCardPlay}
                    canPlay={isMyTurn() && validActions.includes('summon')}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Actions
              </h3>
              
              <div className="space-y-2">
                {validActions.includes('summon') && (
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    disabled={!isMyTurn()}
                  >
                    Summon Card
                  </button>
                )}
                
                {validActions.includes('move') && (
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    disabled={!isMyTurn()}
                  >
                    Move Card
                  </button>
                )}
                
                {validActions.includes('attack') && (
                  <button
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    disabled={!isMyTurn()}
                  >
                    Attack
                  </button>
                )}
                
                {validActions.includes('end_turn') && (
                  <button
                    onClick={handleEndTurn}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    disabled={!isMyTurn()}
                  >
                    End Turn
                  </button>
                )}
              </div>
            </div>

            {/* Game Status */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Game Status
              </h3>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div>Status: {gameState.status}</div>
                <div>Phase: {gameState.phase}</div>
                <div>Turn: {gameState.turn_number}</div>
                <div>Cards in field: {gameState.field.cards.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;