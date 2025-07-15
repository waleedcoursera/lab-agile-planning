import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MultiplayerLobby = () => {
  const [rooms, setRooms] = useState([]);
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize socket connection
    const socketConnection = io(BACKEND_URL);
    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      setIsConnected(true);
    });

    socketConnection.on('disconnect', () => {
      setIsConnected(false);
    });

    socketConnection.on('room_created', (data) => {
      setRooms(prev => [...prev, data.room]);
    });

    socketConnection.on('game_started', (data) => {
      navigate(`/game/${data.gameId}`);
    });

    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [navigate]);

  const createRoom = async () => {
    if (!playerName.trim()) {
      alert('يرجى إدخال اسم اللاعب');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/games`, {
        player1_id: playerName,
        is_multiplayer: true
      });

      const roomData = {
        id: response.data.game_state.id,
        name: `${playerName}'s Room`,
        players: [playerName],
        maxPlayers: 2,
        status: 'waiting'
      };

      setRooms(prev => [...prev, roomData]);
      setSelectedRoom(roomData);
      
      // Join the room via socket
      socket.emit('create_room', roomData);
      
    } catch (error) {
      console.error('Error creating room:', error);
      alert('خطأ في إنشاء الغرفة');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = (room) => {
    if (!playerName.trim()) {
      alert('يرجى إدخال اسم اللاعب');
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      alert('الغرفة ممتلئة');
      return;
    }

    // Join room via socket
    socket.emit('join_room', {
      roomId: room.id,
      playerName: playerName
    });

    setSelectedRoom(room);
  };

  const leaveRoom = () => {
    if (selectedRoom) {
      socket.emit('leave_room', {
        roomId: selectedRoom.id,
        playerName: playerName
      });
      setSelectedRoom(null);
    }
  };

  const startGame = () => {
    if (selectedRoom && selectedRoom.players.length === 2) {
      socket.emit('start_game', {
        roomId: selectedRoom.id
      });
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            لوبي متعدد اللاعبين
          </h1>
          <p className="text-xl text-gray-300">
            انضم إلى غرفة أو أنشئ غرفة جديدة للعب مع الأصدقاء
          </p>
        </motion.div>

        {/* Connection Status */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-white">
                {isConnected ? 'متصل' : 'غير متصل'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="اسم اللاعب"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={createRoom}
                disabled={loading || !isConnected || selectedRoom}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:from-yellow-500 hover:to-orange-600 transition-all duration-300"
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء غرفة'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Room List */}
          <div className="lg:col-span-2">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                الغرف المتاحة
              </h2>
              
              {rooms.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <p className="mb-4">لا توجد غرف متاحة حاليًا</p>
                  <p className="text-sm">أنشئ غرفة جديدة للبدء</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {room.name}
                          </h3>
                          <div className="text-sm text-gray-300">
                            اللاعبون: {room.players.length} / {room.maxPlayers}
                          </div>
                          <div className="text-sm text-gray-300">
                            الحالة: {room.status === 'waiting' ? 'في الانتظار' : 'يلعب'}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-2">
                            {room.players.map((player, index) => (
                              <div
                                key={index}
                                className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-purple-900 font-bold text-sm border-2 border-gray-800"
                              >
                                {player.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => joinRoom(room)}
                            disabled={room.players.length >= room.maxPlayers || selectedRoom}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                          >
                            {room.players.length >= room.maxPlayers ? 'ممتلئة' : 'انضم'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Room */}
          <div className="space-y-6">
            {selectedRoom ? (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">
                  الغرفة الحالية
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {selectedRoom.name}
                    </h4>
                    <p className="text-sm text-gray-300">
                      معرف الغرفة: {selectedRoom.id.substring(0, 8)}...
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="text-md font-semibold text-white mb-2">
                      اللاعبون:
                    </h5>
                    <div className="space-y-2">
                      {selectedRoom.players.map((player, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-purple-900 font-bold text-xs">
                            {player.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white">{player}</span>
                          {player === playerName && (
                            <span className="text-yellow-400 text-xs">(أنت)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedRoom.players.length === 2 && (
                      <button
                        onClick={startGame}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300"
                      >
                        🎮 بدء اللعبة
                      </button>
                    )}
                    
                    <button
                      onClick={leaveRoom}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      مغادرة الغرفة
                    </button>
                  </div>
                  
                  {selectedRoom.players.length < 2 && (
                    <div className="text-center text-gray-300 text-sm">
                      في انتظار لاعب آخر...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">
                  كيفية اللعب
                </h3>
                
                <div className="space-y-4 text-sm text-gray-300">
                  <div>
                    <div className="font-semibold text-white mb-1">1. أدخل اسم اللاعب</div>
                    <div>اختر اسماً فريداً لتمثيلك في اللعبة</div>
                  </div>
                  
                  <div>
                    <div className="font-semibold text-white mb-1">2. أنشئ غرفة أو انضم</div>
                    <div>يمكنك إنشاء غرفة جديدة أو الانضمام إلى غرفة موجودة</div>
                  </div>
                  
                  <div>
                    <div className="font-semibold text-white mb-1">3. ابدأ المبارزة</div>
                    <div>عندما يكون هناك لاعبان، يمكن بدء اللعبة</div>
                  </div>
                  
                  <div>
                    <div className="font-semibold text-white mb-1">4. استمتع!</div>
                    <div>العب بنفس قوانين اللعبة الأصلية</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                إحصائيات سريعة
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">الغرف النشطة:</span>
                  <span className="text-white font-semibold">{rooms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">اللاعبون الآن:</span>
                  <span className="text-white font-semibold">
                    {rooms.reduce((sum, room) => sum + room.players.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">الغرف المتاحة:</span>
                  <span className="text-white font-semibold">
                    {rooms.filter(room => room.players.length < room.maxPlayers).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;