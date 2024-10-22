import React from 'react';
import { GithubIcon, Linkedin, Mail, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 bg-opacity-80 p-4 sm:p-6 text-center">
      <div className="container mx-auto">
        <div className="flex justify-center mb-4">
          <a href="https://github.com/dkoval" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-blue-400">
            <GithubIcon className="inline-block w-6 h-6" />
          </a>
          <a href="https://linkedin.com/in/dmytrokoval" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-blue-400">
            <Linkedin className="inline-block w-6 h-6" />
          </a>
          <a href="https://twitter.com/dkovalbuzz" target="_blank" rel="noopener noreferrer" className="mx-2 hover:text-blue-400">
            <Twitter className="inline-block w-6 h-6" />
          </a>
          <a href="mailto:dkoderinc@gmail.com" className="mx-2 hover:text-blue-400">
            <Mail className="inline-block w-6 h-6" />
          </a>
        </div>
        <p className="text-sm sm:text-base">&copy; {currentYear} DKoder Inc. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
