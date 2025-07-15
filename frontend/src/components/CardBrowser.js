import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CardBrowser = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    cardType: '',
    race: '',
    attribute: '',
    page: 1
  });
  const [totalPages, setTotalPages] = useState(1);

  const cardTypes = [
    { value: '', label: 'جميع الأنواع' },
    { value: 'monster', label: 'وحوش' },
    { value: 'spell', label: 'سحر' },
    { value: 'trap', label: 'فخ' }
  ];

  const races = [
    { value: '', label: 'جميع الأجناس' },
    { value: 'dragon', label: 'تنين' },
    { value: 'warrior', label: 'محارب' },
    { value: 'spellcaster', label: 'ساحر' },
    { value: 'fiend', label: 'شيطان' },
    { value: 'zombie', label: 'زومبي' },
    { value: 'machine', label: 'آلة' },
    { value: 'fairy', label: 'جنية' }
  ];

  const attributes = [
    { value: '', label: 'جميع الخصائص' },
    { value: 'light', label: 'ضوء' },
    { value: 'dark', label: 'ظلام' },
    { value: 'fire', label: 'نار' },
    { value: 'water', label: 'ماء' },
    { value: 'earth', label: 'أرض' },
    { value: 'wind', label: 'رياح' }
  ];

  useEffect(() => {
    fetchCards();
  }, [filters]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.cardType) params.append('card_type', filters.cardType);
      if (filters.race) params.append('race', filters.race);
      if (filters.attribute) params.append('attribute', filters.attribute);
      params.append('skip', (filters.page - 1) * 20);
      params.append('limit', 20);

      const response = await axios.get(`${API}/cards?${params}`);
      setCards(response.data.cards);
      setTotalPages(Math.ceil(response.data.total / 20));
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const getCardTypeColor = (type) => {
    switch (type) {
      case 'monster': return 'bg-yellow-600';
      case 'spell': return 'bg-green-600';
      case 'trap': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getTerrainBonus = (bonuses) => {
    if (!bonuses || Object.keys(bonuses).length === 0) return 'لا يوجد';
    
    const terrainNames = {
      forest: 'غابة',
      meadow: 'مرج',
      mountain: 'جبل',
      sea: 'بحر',
      wasteland: 'أرض قاحلة',
      darkness: 'ظلام',
      toon: 'كرتون'
    };
    
    return Object.entries(bonuses)
      .filter(([_, bonus]) => bonus > 0)
      .map(([terrain, bonus]) => `${terrainNames[terrain]}: +${bonus}`)
      .join(', ') || 'لا يوجد';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            مجموعة البطاقات
          </h1>
          <p className="text-xl text-gray-300">
            استعرض جميع البطاقات الـ 854 من اللعبة الأصلية
          </p>
        </motion.div>

        {/* Filters */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                البحث
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="ابحث عن البطاقات..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                نوع البطاقة
              </label>
              <select
                value={filters.cardType}
                onChange={(e) => handleFilterChange('cardType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {cardTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                الجنس
              </label>
              <select
                value={filters.race}
                onChange={(e) => handleFilterChange('race', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {races.map(race => (
                  <option key={race.value} value={race.value}>
                    {race.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                الخاصية
              </label>
              <select
                value={filters.attribute}
                onChange={(e) => handleFilterChange('attribute', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {attributes.map(attr => (
                  <option key={attr.value} value={attr.value}>
                    {attr.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  search: '', cardType: '', race: '', attribute: '', page: 1
                })}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-opacity-20 transition-all duration-300"
              onClick={() => setSelectedCard(card)}
            >
              <div className="aspect-w-3 aspect-h-4 mb-4">
                <img
                  src={card.image_url || 'https://via.placeholder.com/300x400?text=Card+Image'}
                  alt={card.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {card.name}
                </h3>
                
                <div className="flex justify-center mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getCardTypeColor(card.card_type)}`}>
                    {card.card_type === 'monster' ? 'وحش' : card.card_type === 'spell' ? 'سحر' : 'فخ'}
                  </span>
                </div>
                
                {card.card_type === 'monster' && (
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>ATK: {card.attack}</span>
                    <span>DEF: {card.defense}</span>
                  </div>
                )}
                
                <div className="text-sm text-yellow-400 mt-2">
                  تكلفة: {card.deck_cost}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => handleFilterChange('page', filters.page - 1)}
            disabled={filters.page === 1}
            className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 hover:bg-gray-600 transition-colors"
          >
            السابق
          </button>
          
          <span className="px-4 py-2 bg-yellow-400 text-purple-900 rounded-md font-semibold">
            {filters.page} من {totalPages}
          </span>
          
          <button
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={filters.page === totalPages}
            className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 hover:bg-gray-600 transition-colors"
          >
            التالي
          </button>
        </div>
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-yellow-400">
                {selectedCard.name}
              </h2>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img
                  src={selectedCard.image_url || 'https://via.placeholder.com/300x400?text=Card+Image'}
                  alt={selectedCard.name}
                  className="w-full rounded-lg"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className={`px-3 py-1 rounded text-sm font-semibold text-white ${getCardTypeColor(selectedCard.card_type)}`}>
                    {selectedCard.card_type === 'monster' ? 'وحش' : selectedCard.card_type === 'spell' ? 'سحر' : 'فخ'}
                  </span>
                </div>
                
                {selectedCard.card_type === 'monster' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">الهجوم:</span>
                      <span className="text-white font-semibold">{selectedCard.attack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">الدفاع:</span>
                      <span className="text-white font-semibold">{selectedCard.defense}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">المستوى:</span>
                      <span className="text-white font-semibold">{selectedCard.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">الخاصية:</span>
                      <span className="text-white font-semibold">{selectedCard.attribute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">الجنس:</span>
                      <span className="text-white font-semibold">{selectedCard.race}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-300">تكلفة السطح:</span>
                  <span className="text-yellow-400 font-semibold">{selectedCard.deck_cost}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-300">قائد السطح:</span>
                  <span className="text-white font-semibold">
                    {selectedCard.can_be_deck_leader ? 'نعم' : 'لا'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-300">مكافآت التضاريس:</span>
                  <div className="text-white text-sm mt-1">
                    {getTerrainBonus(selectedCard.terrain_bonuses)}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-300">الوصف:</span>
                  <p className="text-white text-sm mt-1 leading-relaxed">
                    {selectedCard.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CardBrowser;