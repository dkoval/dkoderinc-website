import React, { useEffect } from 'react';
import Header from './components/Header';
import MainSection from './components/MainSection';
import Footer from './components/Footer';

const App: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")', backgroundSize: 'cover', backgroundPosition: 'center'}}>
      <Header />
      <MainSection />
      <Footer />
    </div>
  );
};

export default App;