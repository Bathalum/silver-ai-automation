import { Button } from "@/components/ui/button"
import { Section } from "@/components/ui/section"
import { GradientText } from "@/components/ui/gradient-text"
import { ArrowRight, Sparkles, Zap, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <Section className="pt-32 pb-20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium border border-blue-100 hover:bg-blue-100 transition-colors duration-300">
              <Sparkles className="h-4 w-4 animate-pulse" />
              AI-Powered Automation Platform
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Automation Starts with a Plan <GradientText>Systemize, Optimize, Then Automate</GradientText>
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed">
          We design, build, and automate your workflow.
          From mapping your processes to integrating your tools, building no-code systems, and setting you up for AI agents, we make it easy, so your systems just work. No stress. No Confusion.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full sm:w-auto group hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 w-full sm:w-auto bg-transparent hover:bg-gray-50 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              Watch Demo
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
            <div className="text-center group cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-2 mx-auto group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-300">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                80%
              </div>
              <div className="text-sm text-gray-600">Time Saved</div>
            </div>
            <div className="text-center group cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-2 mx-auto group-hover:bg-green-200 group-hover:scale-110 transition-all duration-300">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-300">
                300%
              </div>
              <div className="text-sm text-gray-600">ROI Increase</div>
            </div>
            <div className="text-center group cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-2 mx-auto group-hover:bg-purple-200 group-hover:scale-110 transition-all duration-300">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
                99.9%
              </div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="relative animate-fade-in-up delay-300">
          <div className="relative z-10 group">
            <img
              src="/SA Stages Image.png?height=600&width=600"
              alt="AI Automation Dashboard"
              className="w-full h-auto rounded-2xl shadow-2xl group-hover:shadow-3xl transition-all duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          {/* Background decorations */}
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        </div>
      </div>
    </Section>
  )
}
