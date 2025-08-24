// Use case for getting service/work process data
// Following Clean Architecture application layer patterns

import type { ServiceData } from "@/components/features/service-card"

/**
 * Work process step data interface
 */
export interface WorkProcessStep extends ServiceData {
  step: number
  duration?: string
  deliverables?: string[]
  tools?: string[]
}

/**
 * Icon data for services - using icon names that can be mapped to actual icons in the presentation layer
 */
export type ServiceIconType = 
  | 'search'
  | 'grid'
  | 'code'
  | 'lightning'
  | 'chart'
  | 'chat'
  | 'fire'

/**
 * Get work process steps - Application layer use case
 * 
 * This function provides the business logic for retrieving work process data.
 * In a full implementation, this might fetch from a database or external API,
 * but for now it returns static data that matches the business requirements.
 */
export function getWorkProcess(): WorkProcessStep[] {
  return [
    {
      id: "discovery",
      step: 1,
      title: "Discovery & Analysis", 
      description: "We start by understanding your business processes, identifying pain points, and mapping current workflows to find the best automation opportunities.",
      color: "#3B82F6",
      duration: "1-2 weeks",
      features: [
        "Process mapping and documentation",
        "Bottleneck identification", 
        "ROI opportunity assessment",
        "Stakeholder interviews"
      ],
      deliverables: [
        "Current state analysis report",
        "Automation opportunity matrix",
        "Initial ROI projections"
      ],
      tools: ["Process mapping software", "Analytics tools", "Interview frameworks"]
    },
    {
      id: "strategy",
      step: 2,
      title: "Strategy & Planning",
      description: "Based on our findings, we create a comprehensive automation strategy with clear priorities, timelines, and success metrics.",
      color: "#10B981",
      duration: "1 week",
      features: [
        "Automation roadmap creation",
        "Technology stack selection",
        "Implementation timeline",
        "Success metrics definition"
      ],
      deliverables: [
        "Automation strategy document",
        "Technical architecture plan",
        "Project timeline and milestones"
      ],
      tools: ["Strategic planning tools", "Architecture design software", "Project management platforms"]
    },
    {
      id: "implementation",
      step: 3, 
      title: "Implementation & Integration",
      description: "Our expert team builds and integrates the AI automation solutions, ensuring seamless connectivity with your existing systems.",
      color: "#F59E0B",
      duration: "2-6 weeks",
      features: [
        "Custom AI solution development",
        "System integration and APIs",
        "Testing and quality assurance",
        "Security and compliance setup"
      ],
      deliverables: [
        "Deployed automation solution",
        "Integration documentation",
        "Test results and validation"
      ],
      tools: ["AI/ML frameworks", "Integration platforms", "Testing tools", "Security scanners"]
    },
    {
      id: "optimization",
      step: 4,
      title: "Optimization & Support",
      description: "We monitor performance, fine-tune the system, and provide ongoing support to ensure maximum efficiency and continuous improvement.",
      color: "#8B5CF6", 
      duration: "Ongoing",
      features: [
        "Performance monitoring and analytics",
        "Continuous optimization",
        "User training and support",
        "Regular system updates"
      ],
      deliverables: [
        "Performance dashboard",
        "Optimization reports",
        "Support documentation"
      ],
      tools: ["Monitoring platforms", "Analytics tools", "Support systems", "Training platforms"]
    }
  ]
}

/**
 * Get service offerings - Additional use case for general services
 */
export function getServiceOfferings(): ServiceData[] {
  return [
    {
      id: "ai-automation",
      title: "AI Process Automation",
      description: "Streamline repetitive tasks with intelligent automation that learns and adapts to your business processes.",
      color: "#3B82F6",
      features: [
        "Workflow automation",
        "Document processing",
        "Data entry automation",
        "Email and communication automation"
      ]
    },
    {
      id: "data-analytics", 
      title: "Intelligent Data Analytics",
      description: "Transform raw data into actionable insights with AI-powered analytics and predictive modeling.",
      color: "#10B981",
      features: [
        "Real-time dashboards",
        "Predictive analytics",
        "Custom reporting",
        "Data visualization"
      ]
    },
    {
      id: "customer-service",
      title: "AI Customer Service",
      description: "Enhance customer experience with intelligent chatbots, automated responses, and personalized interactions.",
      color: "#F59E0B",
      features: [
        "24/7 AI chatbots",
        "Sentiment analysis",
        "Automated ticket routing",
        "Personalized responses"
      ]
    },
    {
      id: "integration",
      title: "System Integration",
      description: "Connect and synchronize your existing tools and platforms for seamless data flow and unified operations.",
      color: "#8B5CF6",
      features: [
        "API integrations",
        "Data synchronization",
        "Legacy system modernization",
        "Cloud migration"
      ]
    }
  ]
}

/**
 * Get specific service by ID
 */
export function getServiceById(id: string): ServiceData | undefined {
  const allServices = [...getWorkProcess(), ...getServiceOfferings()]
  return allServices.find(service => service.id === id)
}

/**
 * Get services by category
 */
export function getServicesByCategory(category: 'process' | 'offering'): ServiceData[] {
  switch (category) {
    case 'process':
      return getWorkProcess()
    case 'offering':
      return getServiceOfferings()
    default:
      return []
  }
}