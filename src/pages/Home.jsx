
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Brain, Shield, Users, Activity, CheckCircle, ArrowRight, Stethoscope, Zap, Database } from 'lucide-react';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        // User is not logged in, which is fine for the public home page
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleCtaClick = async () => {
    if (user) {
      // If user is already logged in, redirect them to their dashboard
      const destination = user.role === 'admin' ? 'AdminDashboard' : 'DoctorDashboard';
      navigate(createPageUrl(destination));
    } else {
      // If user is not logged in, redirect to the workspace login page
      // This will redirect to the Base44 login page that has both Google and Email/Password options
      window.location.href = '/login';
    }
  };

  const features = [
    {
      icon: Heart,
      title: "AI-Powered Heart Disease Detection",
      description: "Advanced machine learning algorithms analyze patient data to provide accurate cardiac risk assessments."
    },
    {
      icon: Brain,
      title: "Intelligent Diagnosis Support", 
      description: "Get AI-powered recommendations and insights to support your clinical decision making."
    },
    {
      icon: Shield,
      title: "Blockchain Security",
      description: "All patient records are secured with blockchain technology ensuring data integrity and privacy."
    },
    {
      icon: Activity,
      title: "Real-time Analytics",
      description: "Monitor patient outcomes and track diagnostic accuracy with comprehensive analytics dashboard."
    }
  ];

  const benefits = [
    "HIPAA Compliant Data Protection",
    "Advanced ML Model Integration", 
    "Comprehensive Patient Records",
    "Multi-factor Authentication",
    "Real-time Diagnostic Support",
    "Blockchain-verified Records"
  ];

  const buttonText = user ? "Go to Dashboard" : "Access Medical Portal";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Heart className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <Activity className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                MedChain
              </span>
            </h1>
            
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-8">
              Advanced Heart Disease Detection Platform
            </h2>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Revolutionizing cardiac care with AI-powered diagnostics, blockchain security, 
              and comprehensive patient management. Empowering healthcare professionals 
              with cutting-edge technology for better patient outcomes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                onClick={handleCtaClick}
                size="lg" 
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <Stethoscope className="w-5 h-5 mr-2" />
                {buttonText}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-blue-200 hover:border-blue-300 text-blue-700 px-8 py-4 text-lg font-semibold rounded-xl hover:bg-blue-50 transition-all duration-300"
              >
                <Database className="w-5 h-5 mr-2" />
                View Documentation
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>FDA Guidelines</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Blockchain Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Advanced Medical Technology
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform combines artificial intelligence, blockchain security, and intuitive design 
              to deliver unprecedented capabilities for cardiac care professionals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                Why Healthcare Professionals Choose MedChain
              </h3>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg text-gray-700 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">Live Diagnostic Dashboard</h4>
                      <p className="text-gray-600">Real-time patient monitoring</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">System Status</span>
                      <span className="text-sm font-medium text-green-600">All Systems Operational</span>
                    </div>
                    <div className="bg-gray-100 rounded-lg h-2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg h-2 w-4/5"></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Active Diagnoses: 847</span>
                      <span>Accuracy: 94.7%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Ready to Transform Your Practice?
          </h3>
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            Join hundreds of healthcare professionals already using MedChain to improve 
            patient outcomes and streamline cardiac care diagnostics.
          </p>
          
          <Button 
            onClick={handleCtaClick}
            size="lg" 
            disabled={isLoading}
            className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Users className="w-5 h-5 mr-2" />
            {user ? "Go to My Dashboard" : "Get Started Today"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">MedChain</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 MedChain. Advanced Heart Disease Detection Platform.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
