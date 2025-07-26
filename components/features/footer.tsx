"use client"

import Link from "next/link"
import { Sparkles, Mail, Phone, MapPin, Twitter, Linkedin, Github, ArrowUp } from "lucide-react"

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Sparkles className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300 group-hover:rotate-12" />
              <span className="text-xl font-bold group-hover:text-blue-300 transition-colors duration-300">
                Silver AI Automation
              </span>
            </Link>
            <p className="text-gray-400 leading-relaxed">
              Transforming businesses through intelligent automation solutions. Scale your operations with cutting-edge
              AI technology.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-110 hover:-translate-y-1"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-110 hover:-translate-y-1"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-110 hover:-translate-y-1"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Solutions</h3>
            <ul className="space-y-2">
              {[
                "Process Automation",
                "Data Analytics",
                "Customer Service AI",
                "Custom Development",
                "Integration Services",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-gray-400 hover:text-white transition-all duration-300 hover:translate-x-1 inline-block"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-2">
              {["About Us", "Careers", "Case Studies", "Blog", "Press"].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-gray-400 hover:text-white transition-all duration-300 hover:translate-x-1 inline-block"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all duration-300">
                <Mail className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-gray-400 group-hover:text-white transition-colors duration-300">
                  contact@silveraiautomation.com
                </span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all duration-300">
                <Phone className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-gray-400 group-hover:text-white transition-colors duration-300">
                  +1 (555) 123-4567
                </span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all duration-300">
                <MapPin className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-gray-400 group-hover:text-white transition-colors duration-300">
                  San Francisco, CA
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2024 Silver AI Automation. All rights reserved.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <div className="flex space-x-6">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
                  <Link
                    key={item}
                    href="#"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-300"
                  >
                    {item}
                  </Link>
                ))}
              </div>
              <button
                onClick={scrollToTop}
                className="ml-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-300 hover:scale-110 hover:-translate-y-1 group"
              >
                <ArrowUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
