import React from 'react';
import Terminal from './Terminal';
import AboutMe from './AboutMe';

const MainSection: React.FC = () => {
  return (
    <main className="flex-grow container mx-auto p-6 flex flex-col md:flex-row gap-6">
      <div className="bg-gray-800 bg-opacity-80 p-8 rounded-lg shadow-lg flex-grow">
        <AboutMe />
        <Terminal />
      </div>
    </main>
  );
};

export default MainSection;