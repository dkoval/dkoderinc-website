import React, { useEffect } from 'react';
import Header from './components/Header';
import Main from './components/Main';
import Footer from './components/Footer';

import AboutMe from './components/AboutMe';
import Terminal from './components/Terminal';

const aboutMeProps = {
  whoAmI: "Dmytro Koval",
  headshotImage: "images/headshot.webp",
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
};

const App: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-neon">
      <Header />
      <div
        className="flex-1"
        style={{
          backgroundImage: "url(images/background.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <Main>
          <AboutMe {...aboutMeProps} />
          <Terminal />
        </Main>
      </div>
      <Footer />
    </div>
  );
};

export default App;
