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
      "id": "audit",
      "step": 1,
      "title": "Audit & Analysis",
      "description": "We conduct an event storming session to deeply understand your current workflow, define clear success metrics, and identify requirements to set the foundation for transformation.",
      "color": "#3B82F6",
      "duration": "1-2 weeks",
      "features": [
        "Event storming workshops",
        "Success metrics definition",
        "Requirement gathering",
        "Stakeholder collaboration"
      ],
      "deliverables": [
        "Current workflow documentation",
        "Success metrics report",
        "Requirements analysis"
      ],
      "tools": ["Event storming platforms", "Analytics tools", "Collaboration frameworks"]
    },
    {
      "id": "map_design",
      "step": 2,
      "title": "Map & Design",
      "description": "We map your current workflow to our proprietary Data-Driven Function Model (D2FM), creating a design blueprint for the optimized workflow and identifying actionable steps for implementation, ensuring access is provided.",
      "color": "#10B981",
      "duration": "1-2 weeks",
      "features": [
        "Workflow mapping to D2FM",
        "Design blueprint creation",
        "Action step identification",
        "Access and permissions setup"
      ],
      "deliverables": [
        "D2FM workflow map",
        "Design blueprint document",
        "Action plan with milestones"
      ],
      "tools": ["D2FM modeling tools", "Design software", "Project management platforms"]
    },
    {
      "id": "implementation_integration",
      "step": 3,
      "title": "Implementation & Integration",
      "description": "We execute the action steps, implement the new workflow, integrate it with existing systems, and conduct thorough testing and quality assurance to ensure functionality.",
      "color": "#F59E0B",
      "duration": "2-4 weeks",
      "features": [
        "Action step execution",
        "System integration",
        "Testing and quality assurance",
        "Workflow validation"
      ],
      "deliverables": [
        "Implemented workflow solution",
        "Integration documentation",
        "QA and test reports"
      ],
      "tools": ["Integration platforms", "Testing tools", "Workflow automation software"]
    },
    {
      "id": "rollout_support",
      "step": 4,
      "title": "Roll Out & Support",
      "description": "We collaborate with your change management team to roll out the new workflow, propose a pilot system if needed, and provide bug fixes and updates for one week post-rollout.",
      "color": "#8B5CF6",
      "duration": "1 week",
      "features": [
        "Change management collaboration",
        "Pilot system setup (if applicable)",
        "Bug fixing and updates",
        "User support during rollout"
      ],
      "deliverables": [
        "Rollout plan and execution report",
        "Pilot system documentation (if applicable)",
        "Support and bug fix logs"
      ],
      "tools": ["Change management tools", "Support systems", "Monitoring platforms"]
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