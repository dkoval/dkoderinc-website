import React, { useEffect } from 'react';
import Header from './components/Header';
import Main from './components/Main';
import Footer from './components/Footer';

import AboutMe from './components/AboutMe';
import Terminal from './components/Terminal';

const aboutMeProps = {
  whoAmI: "Dmytro Koval",
  headshotImage: "images/dmytro_koval_headshot.jpg",
  summary: [
    "I am a seasoned software engineer with over 15 years of experience in the industry. \
    I specialize in backend development using a wide range of open-source technologies in Java and Kotlin.",
    "My expertise lies in building robust, scalable, and efficient server-side applications, \
    but I am genuinely interested in any intellectually engaging engineering problem."
  ],
  skills: [
    "Java and Kotlin programming languages",
    "Microservices and distributed systems",
    "API design and integration",
    "Concurrent, latency-sensitive applications",
    "Event-driven architecture",
    "Technical leadership"
  ]
}

const App: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div 
      className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-neon" 
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center'
      }}
    >
      <Header />
      <Main>
        <AboutMe {...aboutMeProps} />
        <Terminal />
      </Main>
      <Footer />
    </div>
  );
};

export default App;
