import React from 'react';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 bg-opacity-80 p-6 text-center">
      <div className="container mx-auto">
        <div className="flex justify-center mb-4">
          <a href="https://github.com/dkoval" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-blue-400">
            <Github className="inline-block" />
          </a>
          <a href="https://linkedin.com/in/dmytrokoval" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-blue-400">
            <Linkedin className="inline-block" />
          </a>
          <a href="https://twitter.com/dkovalbuzz" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-blue-400">
            <Twitter className="inline-block" />
          </a>
          <a href="mailto:dkoderinc@gmail.com" className="mx-2 hover:text-blue-400">
            <Mail className="inline-block" />
          </a>
        </div>
        <p>&copy; {currentYear} DKoder Inc. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;