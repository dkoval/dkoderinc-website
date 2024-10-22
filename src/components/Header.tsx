import React from 'react';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 bg-opacity-80 p-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-black rounded-lg p-2 mr-2">
            <span className="font-mono text-green-400 text-xl">$</span>
          </div>
          <h1 className="text-2xl font-mono font-bold">
            <span className="text-green-400">dmytro_koval@</span>
            <span className="text-blue-400">dkoderinc</span>
            <span className="text-gray-400 animate-blink">_</span>
          </h1>
        </div>
        <nav>
          <a
            href="https://github.com/dkoval"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 hover:text-blue-400"
          >
            <Github className="inline-block" />
          </a>
          <a
            href="https://linkedin.com/in/dmytrokoval"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 hover:text-blue-400"
          >
            <Linkedin className="inline-block" />
          </a>
          <a
            href="https://twitter.com/dkovalbuzz"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-2 hover:text-blue-400"
          >
            <Twitter className="inline-block" />
          </a>
          <a
            href="mailto:dkoderinc@gmail.com"
            className="mx-2 hover:text-blue-400"
          >
            <Mail className="inline-block" />
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
