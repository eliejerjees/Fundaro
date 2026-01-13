'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, Sparkles, ArrowRight, Zap } from 'lucide-react';

const FundaroLanding: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.8s ease-out forwards; }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"
          style={{
            top: '10%',
            left: '20%',
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
          }}
        />
        <div 
          className="absolute w-96 h-96 bg-purple-500 rounded-full opacity-20 blur-3xl"
          style={{
            bottom: '20%',
            right: '10%',
            transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)`
          }}
        />
        <div 
          className="absolute w-96 h-96 bg-pink-500 rounded-full opacity-10 blur-3xl"
          style={{
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`
          }}
        />
      </div>

      {/* Minimal nav */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">fundaro</span>
          </div>
          <Link
            href="/login"
            className="px-5 py-2 glass rounded-full hover:bg-white/10 transition"
          >
            sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="animate-slide-up mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm mb-8">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>for clubs that want their money right</span>
            </div>
          </div>
          
          <h1 
            className="text-7xl md:text-8xl font-bold mb-8 leading-none"
            style={{ 
              animationDelay: '0.2s',
              opacity: 0
            }}
            onAnimationEnd={(e) => e.currentTarget.style.opacity = '1'}
          >
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              stop losing
            </div>
            <div className="animate-slide-up gradient-text" style={{ animationDelay: '0.3s' }}>
              track of funds
            </div>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.5s' }}>
            one place for budgets, expenses, and approvals. 
            no spreadsheets. no chaos. just clarity.
          </p>

          <div className="flex gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.7s' }}>
            <Link
              href="/login"
              className="group px-8 py-4 bg-white text-black rounded-full font-semibold hover:scale-105 transition flex items-center gap-2"
            >
              start free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          {/* Floating dashboard mockup */}
          <div className="mt-20 animate-float">
            <div className="glass rounded-3xl p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-left">
                  <div className="text-gray-500 text-sm mb-2">balance</div>
                  <div className="text-3xl font-bold">$12.4k</div>
                  <div className="text-green-400 text-sm mt-1">+18% ↑</div>
                </div>
                <div className="text-left">
                  <div className="text-gray-500 text-sm mb-2">spent</div>
                  <div className="text-3xl font-bold">$7.2k</div>
                  <div className="text-blue-400 text-sm mt-1">this month</div>
                </div>
                <div className="text-left">
                  <div className="text-gray-500 text-sm mb-2">pending</div>
                  <div className="text-3xl font-bold">4</div>
                  <div className="text-yellow-400 text-sm mt-1">need approval</div>
                </div>
              </div>
              
              <div className="mt-8 h-32 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 animate-pulse-glow bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - simplified */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-20">
            everything you need,<br />
            <span className="gradient-text">nothing you don't</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass rounded-3xl p-8 hover:bg-white/10 transition group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">instant clarity</h3>
              <p className="text-gray-400">see where every dollar goes in real-time</p>
            </div>

            <div className="glass rounded-3xl p-8 hover:bg-white/10 transition group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">team ready</h3>
              <p className="text-gray-400">everyone stays in sync, automatically</p>
            </div>

            <div className="glass rounded-3xl p-8 hover:bg-white/10 transition group">
              <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <DollarSign className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">actually simple</h3>
              <p className="text-gray-400">no finance degree needed, promise</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center">
            <p className="text-2xl mb-6 leading-relaxed">
              "switched from excel hell to fundaro. saved 4 hours a week and 
              actually know where our money is now"
            </p>
            <div className="text-gray-400">— maya, robotics club treasurer</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-6xl font-bold mb-8">
            ready to get<br />
            <span className="gradient-text">organized?</span>
          </h2>
          <button className="group px-12 py-5 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition flex items-center gap-3 mx-auto">
            try fundaro free
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition" />
          </button>
          <p className="text-gray-500 mt-6 text-sm">no card, no commitment, no nonsense</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="font-bold">fundaro</span>
          </div>
          <div className="text-gray-500 text-sm">© 2026 fundaro</div>
        </div>
      </footer>
    </div>
  );
};

export default FundaroLanding;
