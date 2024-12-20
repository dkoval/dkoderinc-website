
import { Command, Cpu, History, Mail, Sparkles } from 'lucide-react';
import { CommandSuggestion } from './types';

export const suggestions: CommandSuggestion[] = [
  { command: 'about', description: 'Learn about me', icon: <Command className="w-4 h-4 text-purple-400" /> },
  { command: 'experience', description: 'See professional experience', icon: <History className="w-4 h-4 text-yellow-400" /> },
  { command: 'skills', description: 'View technical expertise', icon: <Cpu className="w-4 h-4 text-green-400" /> },
  { command: 'contact', description: 'Get contact information', icon: <Mail className="w-4 h-4 text-blue-400" /> },
  { command: 'clear', description: 'Clear terminal screen', icon: <Sparkles className="w-4 h-4 text-pink-400" /> },
];

export const commands = {
  help: [
    '📎 Example usage:',
    '  • about      - Learn about me',
    '  • experience - See professional experience',
    '  • skills     - View technical expertise',
    '  • contact    - Get contact information',
    '  • clear      - Clear terminal screen',
    '',
    '💡 Pro Tips:',
    '  • Use ↑↓ arrows to navigate command history',
    '  • Ctrl+L to clear terminal screen',
  ],
  about: [
    '👨‍💻 About Dmytro Koval',
    '',
    'A seasoned software engineer with 15+ years of experience in backend development.',
    'Passionate about building scalable distributed systems and high-performance applications.',
  ],
  experience: [
    '💼 Professional Experience',
    '',
    '🚀 Senior Software Engineer specializing in:',
    '   • Backend development',
    '   • Distributed systems',
    '   • High-performance applications',
    '',
    '🏆 Quick Summary:',
    '   • Led the development of multiple successful enterprise projects',
    '   • Spearheaded various software redesign initiatives',
    '   • Optimized system performance by untangling technical debt',
    '   • Mentored junior developers',
    '   • Contributed to SDLC improvements',
  ],
  skills: [
    '🛠️ Technical Skills',
    '',
    '📚 Programming Languages:',
    '  • Fluent in Java and Kotlin',
    '  • Familiar with Scala, Python, Ruby',
    '',
    '🏗️ System Design:',
    '  • Microservices',
    '  • API and integration',
    '  • Event-driven architecture',
    '',
    '🤖 Core Technologies:',
    '  • Frameworks: Spring Boot, Project Reactor, Kafka Streams',
    '  • Messaging: Apache Kafka, Tibco EMS',
    '  • Databases: Elasticsearch, MySQL, PostgreSQL',    
  ],
  contact: [
    '<a href="https://github.com/dkoval" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-400 hover:underline"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>github.com/dkoval</a>',
    '<a href="https://linkedin.com/in/dmytrokoval" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-400 hover:underline"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>linkedin.com/in/dmytrokoval</a>',
    '<a href="https://twitter.com/dkovalbuzz" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-400 hover:underline"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>twitter.com/dkovalbuzz</a>',
    '<a href="mailto:dkoderinc@gmail.com" class="inline-flex items-center text-blue-400 hover:underline"><svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>dkoderinc@gmail.com</a>',
  ],
};
