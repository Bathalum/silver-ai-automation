"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Section } from "@/components/ui/section"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { validateContactForm } from "@/lib/domain/rules/validation"
import { submitContactForm } from "@/lib/infrastructure/contact-service"

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateContactForm(formData)
    if (!validation.isValid) {
      setSubmitMessage(validation.errors.join(", "))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitContactForm(formData)
      setSubmitMessage(result.message)
      if (result.success) {
        setFormData({ name: "", email: "", message: "" })
      }
    } catch (error) {
      setSubmitMessage("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Section id="contact" className="bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Ready to Transform Your Business?</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Get in touch with our AI automation experts and discover how we can help you achieve unprecedented efficiency
          and growth.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <Card className="hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Send us a message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="group">
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 group-hover:border-blue-300"
                  required
                />
              </div>
              <div className="group">
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 group-hover:border-blue-300"
                  required
                />
              </div>
              <div className="group">
                <Textarea
                  placeholder="Your Message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 group-hover:border-blue-300 resize-none"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5 group"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </Button>
              {submitMessage && (
                <p className="text-sm text-center text-gray-600 mt-2 animate-fade-in">{submitMessage}</p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Get in touch</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/50 p-3 rounded-lg transition-all duration-300">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-300">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                  contact@silveraiautomation.com
                </span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/50 p-3 rounded-lg transition-all duration-300">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg group-hover:bg-green-200 group-hover:scale-110 transition-all duration-300">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-gray-700 group-hover:text-green-600 transition-colors duration-300">
                  +1 (555) 123-4567
                </span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/50 p-3 rounded-lg transition-all duration-300">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg group-hover:bg-purple-200 group-hover:scale-110 transition-all duration-300">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-gray-700 group-hover:text-purple-600 transition-colors duration-300">
                  San Francisco, CA
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl hover:bg-white/80 transition-all duration-300 hover:shadow-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Business Hours</h4>
            <p className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM PST</p>
            <p className="text-gray-600">Saturday - Sunday: Closed</p>
          </div>
        </div>
      </div>
    </Section>
  )
}
