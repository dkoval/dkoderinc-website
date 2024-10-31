import React from 'react';

type MainProps = {
  children: React.ReactNode;
}

const Main: React.FC<MainProps> = ({ children }) => {
  return (
    <main className="flex-grow container mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
      <div className="bg-gray-800 bg-opacity-80 p-4 sm:p-8 rounded-lg shadow-lg flex-grow">
        {children}
      </div>
    </main>
  );
};

export default Main;
