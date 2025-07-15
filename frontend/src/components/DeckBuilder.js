import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DraggableCard = ({ card, onAdd, isInDeck = false, onRemove, quantity = 1 }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'card',
    item: { card },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleClick = () => {
    if (isInDeck) {
      onRemove(card.id);
    } else {
      onAdd(card);
    }
  };

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-opacity-20 transition-all duration-300"
      onClick={handleClick}
    >
      <div className="aspect-w-3 aspect-h-4 mb-2">
        <img
          src={card.image_url || 'https://via.placeholder.com/200x280?text=Card+Image'}
          alt={card.name}
          className="w-full h-32 object-cover rounded-lg"
        />
      </div>
      
      <div className="text-center">
        <h4 className="text-sm font-semibold text-white mb-1 truncate">
          {card.name}
        </h4>
        
        {card.card_type === 'monster' && (
          <div className="flex justify-between text-xs text-gray-300">
            <span>ATK: {card.attack}</span>
            <span>DEF: {card.defense}</span>
          </div>
        )}
        
        <div className="text-xs text-yellow-400 mt-1">
          تكلفة: {card.deck_cost}
        </div>
        
        {isInDeck && quantity > 1 && (
          <div className="text-xs text-green-400 mt-1">
            العدد: {quantity}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const DeckBuilder = () => {
  const [availableCards, setAvailableCards] = useState([]);
  const [deckLeaders, setDeckLeaders] = useState([]);
  const [currentDeck, setCurrentDeck] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [maxCost, setMaxCost] = useState(2000);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const [{ isOver }, drop] = useDrop({
    accept: 'card',
    drop: (item) => {
      addCardToDeck(item.card);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateTotalCost();
  }, [currentDeck]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [cardsResponse, leadersResponse] = await Promise.all([
        axios.get(`${API}/cards?limit=100`),
        axios.get(`${API}/cards/deck-leaders`)
      ]);
      
      setAvailableCards(cardsResponse.data.cards);
      setDeckLeaders(leadersResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    const total = currentDeck.reduce((sum, deckCard) => {
      const card = availableCards.find(c => c.id === deckCard.card_id);
      return sum + (card ? card.deck_cost * deckCard.quantity : 0);
    }, 0);
    setTotalCost(total);
  };

  const addCardToDeck = (card) => {
    if (totalCost + card.deck_cost > maxCost) {
      alert('تجاوز الحد الأقصى للتكلفة!');
      return;
    }

    const existingCard = currentDeck.find(dc => dc.card_id === card.id);
    if (existingCard) {
      if (existingCard.quantity >= 3) {
        alert('لا يمكن إضافة أكثر من 3 من نفس البطاقة');
        return;
      }
      setCurrentDeck(prev => 
        prev.map(dc => 
          dc.card_id === card.id 
            ? { ...dc, quantity: dc.quantity + 1 }
            : dc
        )
      );
    } else {
      setCurrentDeck(prev => [...prev, { card_id: card.id, quantity: 1 }]);
    }
  };

  const removeCardFromDeck = (cardId) => {
    const existingCard = currentDeck.find(dc => dc.card_id === cardId);
    if (existingCard && existingCard.quantity > 1) {
      setCurrentDeck(prev => 
        prev.map(dc => 
          dc.card_id === cardId 
            ? { ...dc, quantity: dc.quantity - 1 }
            : dc
        )
      );
    } else {
      setCurrentDeck(prev => prev.filter(dc => dc.card_id !== cardId));
    }
  };

  const saveDeck = async () => {
    if (!deckName.trim()) {
      alert('يرجى إدخال اسم السطح');
      return;
    }

    if (!selectedLeader) {
      alert('يرجى اختيار قائد السطح');
      return;
    }

    if (currentDeck.length < 30) {
      alert('يجب أن يحتوي السطح على 30 بطاقة على الأقل');
      return;
    }

    try {
      const deckData = {
        name: deckName,
        player_id: 'player1', // In a real app, this would be the current user's ID
        cards: currentDeck,
        deck_leader_id: selectedLeader.id,
        max_cost: maxCost
      };

      await axios.post(`${API}/decks`, deckData);
      alert('تم حفظ السطح بنجاح!');
      
      // Reset form
      setCurrentDeck([]);
      setDeckName('');
      setSelectedLeader(null);
      setTotalCost(0);
    } catch (error) {
      console.error('Error saving deck:', error);
      alert('حدث خطأ أثناء حفظ السطح');
    }
  };

  const filteredCards = availableCards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || card.card_type === filterType;
    return matchesSearch && matchesType;
  });

  const getDeckCards = () => {
    return currentDeck.map(deckCard => {
      const card = availableCards.find(c => c.id === deckCard.card_id);
      return { ...card, quantity: deckCard.quantity };
    }).filter(card => card.id);
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
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            منشئ السطح
          </h1>
          <p className="text-xl text-gray-300">
            اصنع سطحك المثالي مع نظام التكلفة المتوازن
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Cards */}
          <div className="lg:col-span-2">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                البطاقات المتاحة
              </h2>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث عن البطاقات..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="monster">وحوش</option>
                  <option value="spell">سحر</option>
                  <option value="trap">فخ</option>
                </select>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                {filteredCards.map((card) => (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    onAdd={addCardToDeck}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Deck Builder */}
          <div className="space-y-6">
            {/* Deck Info */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                معلومات السطح
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    اسم السطح
                  </label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="أدخل اسم السطح"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    الحد الأقصى للتكلفة
                  </label>
                  <input
                    type="number"
                    value={maxCost}
                    onChange={(e) => setMaxCost(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-300">التكلفة الحالية:</span>
                  <span className={`font-bold ${totalCost > maxCost ? 'text-red-400' : 'text-yellow-400'}`}>
                    {totalCost} / {maxCost}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-300">عدد البطاقات:</span>
                  <span className="text-white font-bold">
                    {currentDeck.reduce((sum, dc) => sum + dc.quantity, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deck Leader Selection */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                اختر قائد السطح
              </h3>
              
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {deckLeaders.slice(0, 10).map((leader) => (
                  <div
                    key={leader.id}
                    onClick={() => setSelectedLeader(leader)}
                    className={`p-2 rounded-lg cursor-pointer transition-all ${
                      selectedLeader?.id === leader.id
                        ? 'bg-yellow-400 text-purple-900'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">
                      {leader.name}
                    </div>
                    <div className="text-xs">
                      ATK: {leader.attack}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Deck */}
            <div
              ref={drop}
              className={`bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 ${
                isOver ? 'bg-opacity-20' : ''
              }`}
            >
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                السطح الحالي
                {isOver && (
                  <span className="text-green-400 ml-2">
                    (أسقط البطاقة هنا)
                  </span>
                )}
              </h3>
              
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {getDeckCards().map((card) => (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    onRemove={removeCardFromDeck}
                    isInDeck={true}
                    quantity={card.quantity}
                  />
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveDeck}
              disabled={!deckName.trim() || !selectedLeader || currentDeck.length < 30 || totalCost > maxCost}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 px-6 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-500 hover:to-orange-600 transition-all duration-300"
            >
              حفظ السطح
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;