import React from 'react';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 bg-opacity-80 p-4 sm:p-6">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className="bg-black rounded-lg p-2 mr-2">
            <span className="font-mono font-argon text-green-400 text-xl">&gt;_</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-argon font-bold">
            <span className="text-green-400">dmytro_koval@</span>
            <span className="text-blue-400">dkoderinc</span>
            <span className="text-gray-400 animate-blink">_</span>
          </h1>
        </div>
        <nav className="flex justify-center">
          <a
            href="https://github.com/dkoval"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 hover:text-blue-400"
          >
            <Github className="inline-block w-6 h-6" />
          </a>
          <a
            href="https://linkedin.com/in/dmytrokoval"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 hover:text-blue-400"
          >
            <Linkedin className="inline-block w-6 h-6" />
          </a>
          <a
            href="https://twitter.com/dkovalbuzz"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 hover:text-blue-400"
          >
            <Twitter className="inline-block w-6 h-6" />
          </a>
          <a
            href="mailto:dkoderinc@gmail.com"
            className="mx-2 hover:text-blue-400"
          >
            <Mail className="inline-block w-6 h-6" />
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
