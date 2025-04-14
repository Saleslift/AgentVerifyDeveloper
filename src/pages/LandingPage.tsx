import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Shield,
  MessageSquare,
  Star,
  User,
  ArrowRight,
  Building2
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // If user is logged in, redirect to dashboard
  if (user) {
    // Set flag to allow navigation
    sessionStorage.setItem('intentional_navigation', 'true');
    navigate('/developer-dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20">
        {/* Background Image with Gradient */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-black/90"></div>
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-black">
              Real estate and<br />real developers in UAE
            </h1>
            <p className="text-2xl text-gray-600 mb-12">
              Showcase your properties and connect with agencies
            </p>

            {/* Search Component */}
            <div className="relative mb-12" ref={searchContainerRef}>
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full px-6 py-4 pl-14 pr-12 rounded-full bg-white shadow-xl border border-gray-200 text-gray-900 text-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <a
              href="#get-started"
              className="inline-flex items-center px-8 py-4 bg-black text-white rounded-full hover:bg-gray-900 transition-colors text-lg font-medium group"
            >
              Sign Up as Developer
              <ArrowRight className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Why developers use AgentVerify</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Building2 className="h-12 w-12 text-black" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Project Showcase</h3>
              <p className="text-gray-600">
                Showcase your development projects with rich details and attract potential buyers through our platform.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Shield className="h-12 w-12 text-black" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Agency Connections</h3>
              <p className="text-gray-600">
                Connect with verified real estate agencies to help sell your properties faster and more efficiently.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Star className="h-12 w-12 text-black" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Market Insights</h3>
              <p className="text-gray-600">
                Get valuable insights into market trends, buyer preferences, and property performance analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50" id="get-started">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Built for developers like you</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-gray-600 mb-6 text-lg">
                "AgentVerify helped connect our development projects with top agencies in just days. The analytics and insights are invaluable for our marketing strategy."
              </p>
              <div>
                <p className="font-medium">Emirates Development Group</p>
                <p className="text-gray-500">Dubai</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-gray-600 mb-6 text-lg">
                "The platform streamlined our process of finding the right agencies to work with. Now we can focus on building while they handle the sales."
              </p>
              <div>
                <p className="font-medium">Dubai Luxury Developers</p>
                <p className="text-gray-500">UAE</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Showcase your developments to the right audience
          </h2>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center px-8 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-colors text-lg font-medium group"
          >
            Sign Up Now
            <ArrowRight className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}