import { useState } from 'react';
import { Search, BookOpen, MessageSquare, Video, FileText, ChevronRight, ExternalLink, Mail, Phone, HelpCircle, X } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  icon: typeof BookOpen;
}

const helpArticles: HelpArticle[] = [
  { id: '1', title: 'Getting Started with EvidLY', category: 'Setup', summary: 'Complete setup guide — add locations, invite team, set up equipment, and start logging.', icon: BookOpen },
  { id: '2', title: 'Understanding Your Compliance Score', category: 'Dashboard', summary: 'How the 3-pillar scoring works: Food Safety (45%), Fire Safety (30%), Vendor Compliance (25%).', icon: FileText },
  { id: '3', title: 'Temperature Logging Best Practices', category: 'Operations', summary: 'Set schedules, handle out-of-range readings, FDA cooldown tracking, and receiving logs.', icon: FileText },
  { id: '4', title: 'Setting Up Auto Document Requests', category: 'Vendors', summary: 'Configure automatic vendor document requests with secure upload links and reminders.', icon: FileText },
  { id: '5', title: 'Creating & Managing Checklists', category: 'Operations', summary: 'Build opening/closing checklists, customize templates, and track completion rates.', icon: FileText },
  { id: '6', title: 'HACCP Plan Management', category: 'Food Safety', summary: 'Create HACCP plans, define CCPs, set critical limits, and log monitoring activities.', icon: FileText },
  { id: '7', title: 'Vendor Portal & Secure Upload Links', category: 'Vendors', summary: 'How vendors use their portal to upload documents via secure links.', icon: FileText },
  { id: '8', title: 'Preparing for a Health Inspection', category: 'Compliance', summary: 'Use the Compliance Package builder to generate inspection-ready documentation.', icon: FileText },
  { id: '9', title: 'Team Management & Permissions', category: 'Admin', summary: 'Invite team members, assign roles (Management, Kitchen, Facilities), manage access.', icon: FileText },
  { id: '10', title: 'QR Compliance Passport', category: 'Features', summary: 'Generate QR codes for instant compliance verification. Print, share, or display.', icon: FileText },
  { id: '11', title: 'AI Compliance Advisor', category: 'Features', summary: 'Ask compliance questions — FDA, HACCP, fire safety, health codes. Available 24/7.', icon: MessageSquare },
  { id: '12', title: 'Reports & Analytics', category: 'Reporting', summary: 'Weekly digests, trend analysis, compliance forecasting, and exportable reports.', icon: FileText },
];

const categories = ['All', 'Setup', 'Dashboard', 'Operations', 'Vendors', 'Food Safety', 'Compliance', 'Features', 'Admin', 'Reporting'];

interface HelpCenterProps {
  inline?: boolean; // When true, renders as a page section instead of a modal
}

export function HelpCenter({ inline = false }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const filteredArticles = helpArticles.filter((article) => {
    const matchesSearch = searchQuery === '' || article.title.toLowerCase().includes(searchQuery.toLowerCase()) || article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedArticle) {
    return (
      <div className={inline ? '' : 'max-w-3xl mx-auto'}>
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-1 text-sm text-[#1e4d6b] hover:text-[#163a52] mb-4 font-medium"
        >
          ← Back to Help Center
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <span className="inline-block px-2.5 py-1 bg-blue-50 text-[#1e4d6b] text-xs font-medium rounded-full mb-3">{selectedArticle.category}</span>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedArticle.title}</h2>
          <p className="text-gray-600 leading-relaxed">{selectedArticle.summary}</p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Full article content will be loaded from the knowledge base. In the meantime, try the AI Advisor for instant answers.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? '' : 'max-w-3xl mx-auto'}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Help Center</h2>
        <p className="text-gray-500">Find answers, learn features, and get the most out of EvidLY.</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help articles..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#1e4d6b] hover:bg-blue-50/50 transition-all text-left">
          <MessageSquare className="w-8 h-8 text-[#1e4d6b]" />
          <div>
            <p className="text-sm font-semibold text-gray-900">AI Advisor</p>
            <p className="text-xs text-gray-500">Ask any compliance question</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#1e4d6b] hover:bg-blue-50/50 transition-all text-left">
          <Mail className="w-8 h-8 text-[#1e4d6b]" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Email Support</p>
            <p className="text-xs text-gray-500">support@getevidly.com</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#1e4d6b] hover:bg-blue-50/50 transition-all text-left">
          <Phone className="w-8 h-8 text-[#1e4d6b]" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Call Us</p>
            <p className="text-xs text-gray-500">(844) 493-3159</p>
          </div>
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-[#1e4d6b] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles list */}
      <div className="space-y-2">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-[#1e4d6b] hover:bg-blue-50/30 cursor-pointer transition-all"
          >
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{article.title}</p>
                <p className="text-xs text-gray-500 mt-1">{article.summary}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </div>
        ))}
        {filteredArticles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No articles found. Try the AI Advisor for instant answers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
