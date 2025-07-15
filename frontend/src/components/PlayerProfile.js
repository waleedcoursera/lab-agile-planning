import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PlayerProfile = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState(null);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerData();
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      const [playerResponse, statsResponse, decksResponse] = await Promise.all([
        axios.get(`${API}/players/${playerId}`).catch(() => ({ data: null })),
        axios.get(`${API}/players/${playerId}/stats`).catch(() => ({ data: null })),
        axios.get(`${API}/players/${playerId}/decks`).catch(() => ({ data: { decks: [] } }))
      ]);

      setPlayer(playerResponse.data);
      setStats(statsResponse.data);
      setDecks(decksResponse.data.decks);
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            الملف الشخصي
          </h1>
        </motion.div>

        {!player ? (
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">
              إنشاء ملف شخصي جديد
            </h2>
            <p className="text-gray-300 mb-6">
              لم يتم العثور على ملف شخصي. يمكنك إنشاء ملف شخصي جديد للبدء.
            </p>
            <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-8 py-3 rounded-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300">
              إنشاء ملف شخصي
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Player Info */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-purple-900">
                    {player.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                    {player.username}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-300">المستوى:</span>
                      <span className="text-white ml-2 font-semibold">{player.level}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">الخبرة:</span>
                      <span className="text-white ml-2 font-semibold">{player.experience}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">الانتصارات:</span>
                      <span className="text-green-400 ml-2 font-semibold">{player.wins}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">الهزائم:</span>
                      <span className="text-red-400 ml-2 font-semibold">{player.losses}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                  الإحصائيات
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {Math.round(stats.win_rate * 100)}%
                    </div>
                    <div className="text-gray-300">معدل الانتصار</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {stats.wins + stats.losses}
                    </div>
                    <div className="text-gray-300">إجمالي المباريات</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {stats.level}
                    </div>
                    <div className="text-gray-300">المستوى</div>
                  </div>
                </div>
              </div>
            )}

            {/* Decks */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                الأسطح ({decks.length})
              </h3>
              
              {decks.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <p className="mb-4">لم يتم إنشاء أي أسطح بعد</p>
                  <a 
                    href="/deck-builder"
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-6 py-3 rounded-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300"
                  >
                    إنشاء سطح جديد
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {decks.map((deck) => (
                    <div key={deck.id} className="bg-white bg-opacity-10 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {deck.name}
                      </h4>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>البطاقات: {deck.cards.length}</div>
                        <div>التكلفة: {deck.total_cost} / {deck.max_cost}</div>
                        <div>آخر تحديث: {new Date(deck.updated_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                النشاط الأخير
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">انضم إلى اللعبة</span>
                  <span className="text-gray-500">منذ 5 دقائق</span>
                </div>
                
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">أنشأ سطحًا جديدًا</span>
                  <span className="text-gray-500">منذ ساعة</span>
                </div>
                
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-300">فاز في مبارزة</span>
                  <span className="text-gray-500">منذ 3 ساعات</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;