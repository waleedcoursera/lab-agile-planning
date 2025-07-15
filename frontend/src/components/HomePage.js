import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [gameStats, setGameStats] = useState({
    totalCards: 0,
    totalPlayers: 0,
    activeGames: 0
  });

  useEffect(() => {
    fetchGameStats();
  }, []);

  const fetchGameStats = async () => {
    try {
      const response = await axios.get(`${API}/health`);
      // In a real app, you'd fetch actual stats
      setGameStats({
        totalCards: 854,
        totalPlayers: 1250,
        activeGames: 42
      });
    } catch (error) {
      console.error('Error fetching game stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const gameFeatures = [
    {
      icon: '🎮',
      title: 'لعب مفرد',
      description: 'تحدى الذكاء الاصطناعي في مبارزات مثيرة',
      action: 'بدء لعبة جديدة',
      link: '/game/new-single'
    },
    {
      icon: '🌐',
      title: 'متعدد اللاعبين',
      description: 'العب مع أصدقائك أو لاعبين آخرين عبر الإنترنت',
      action: 'انضم للوبي',
      link: '/multiplayer'
    },
    {
      icon: '🃏',
      title: 'مجموعة البطاقات',
      description: 'استعرض جميع البطاقات الـ 854 من اللعبة الأصلية',
      action: 'تصفح البطاقات',
      link: '/cards'
    },
    {
      icon: '🔧',
      title: 'منشئ السطح',
      description: 'اصنع سطحك المثالي بنظام التكلفة المتوازن',
      action: 'إنشاء سطح',
      link: '/deck-builder'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center text-white max-w-4xl mx-auto px-4"
        >
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Yu-Gi-Oh!
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-yellow-300">
            The Duelists of the Roses
          </h2>
          <p className="text-xl md:text-2xl mb-12 leading-relaxed">
            اختبر قوتك في عالم المبارزة الأسطوري! العب بنفس البطاقات والقوانين من اللعبة الأصلية 
            مع إضافات جديدة وتحسينات حديثة.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/game/new-single"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-8 py-4 rounded-lg font-bold text-lg hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105"
            >
              🎮 بدء مبارزة جديدة
            </Link>
            <Link
              to="/multiplayer"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
            >
              🌐 لعب متعدد اللاعبين
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-800 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8"
            >
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                {gameStats.totalCards}
              </div>
              <div className="text-xl text-white">بطاقة أصلية</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8"
            >
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                {gameStats.totalPlayers}+
              </div>
              <div className="text-xl text-white">لاعب نشط</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8"
            >
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                {gameStats.activeGames}
              </div>
              <div className="text-xl text-white">مبارزة نشطة</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-yellow-400 mb-6">
              استكشف عالم المبارزة
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              تمتع بتجربة اللعبة الأصلية مع تحسينات حديثة وميزات جديدة
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {gameFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 hover:bg-opacity-20 transition-all duration-300"
              >
                <div className="text-6xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <Link
                  to={feature.link}
                  className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-6 py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105"
                >
                  {feature.action}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Game Rules Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-yellow-400 mb-6">
              قوانين اللعبة
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              تعلم الأساسيات والقوانين الخاصة بـ Duelists of the Roses
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                🎯 نظام Deck Leader
              </h3>
              <p className="text-gray-300">
                كل لاعب يختار وحش ليكون قائد السطح. قائد السطح يمثل نقاط الحياة ويتيح استدعاء الوحوش الأخرى.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                🏔️ تأثيرات التضاريس
              </h3>
              <p className="text-gray-300">
                الأرض مقسمة إلى 10 أنواع مختلفة من التضاريس. كل نوع يؤثر على قوة الوحوش بطرق مختلفة.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                ⚔️ نظام القتال
              </h3>
              <p className="text-gray-300">
                الوحوش تتصادم عند الالتقاء. القوة الأعلى تنتصر والفرق يصبح ضرر مباشر لنقاط الحياة.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 Yu-Gi-Oh! The Duelists of the Roses - Fan Recreation
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;