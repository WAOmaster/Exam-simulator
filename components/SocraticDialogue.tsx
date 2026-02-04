'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Flag,
  CheckCircle,
  ArrowUp,
} from 'lucide-react';

interface Message {
  role: 'tutor' | 'student';
  message: string;
}

interface SocraticDialogueProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  userAnswer: string;
  onResolved?: () => void;
}

export default function SocraticDialogue({
  isOpen,
  onClose,
  question,
  options,
  correctAnswer,
  userAnswer,
  onResolved,
}: SocraticDialogueProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start the dialogue when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchTutorResponse([]);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fetchTutorResponse = async (history: Message[]) => {
    setIsTyping(true);
    setError('');

    try {
      const response = await fetch('/api/ai/socratic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          options,
          correctAnswer,
          userAnswer,
          conversationHistory: history,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed');

      const tutorMessage: Message = {
        role: 'tutor',
        message: data.tutorMessage,
      };

      setMessages((prev) => [...prev, tutorMessage]);

      if (data.isResolved) {
        setIsResolved(true);
        onResolved?.();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get tutor response');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isTyping || isResolved || gaveUp) return;

    const studentMessage: Message = { role: 'student', message: messageText };
    const newHistory = [...messages, studentMessage];
    setMessages(newHistory);
    setInputText('');

    fetchTutorResponse(newHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGiveUp = () => {
    setGaveUp(true);
    const correctText = options.find((opt) => opt.id === correctAnswer)?.text || correctAnswer;
    const giveUpMessage: Message = {
      role: 'tutor',
      message: `No worries! The correct answer is **${correctAnswer}: ${correctText}**. Understanding comes with practice. Review this concept and you'll get it next time!`,
    };
    setMessages((prev) => [...prev, giveUpMessage]);
  };

  const quickResponses = [
    "I think it's because...",
    "Can you give me a hint?",
    "I'm not sure",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />

          {/* Side Pane */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full lg:w-1/3 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1">
                      Socratic Tutor
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Discover the answer through dialogue
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Resolution Banner */}
              {isResolved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Understanding Achieved!
                    </span>
                    <Sparkles className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Great job working through that!
                  </p>
                </motion.div>
              )}

              {/* Gave Up Banner */}
              {gaveUp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-center"
                >
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    No worries! Review the explanation and try again later.
                  </p>
                </motion.div>
              )}

              {/* Message Bubbles */}
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'tutor'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                        : 'bg-blue-500 text-white rounded-br-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1.5">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isResolved && !gaveUp && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 shrink-0">
                {/* Quick Responses */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickResponses.map((text) => (
                    <button
                      key={text}
                      onClick={() => handleSend(text)}
                      disabled={isTyping}
                      className="px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 border border-indigo-200 dark:border-indigo-700"
                    >
                      {text}
                    </button>
                  ))}
                </div>

                {/* Text Input */}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reasoning..."
                    disabled={isTyping}
                    className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isTyping}
                    className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-indigo-500"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>

                {/* Give Up Button */}
                <button
                  onClick={handleGiveUp}
                  className="mt-3 w-full py-2 text-sm text-red-500 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  I give up - show me the answer
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
