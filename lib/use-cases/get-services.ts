import type { Service } from "../domain/entities/service"

export const getWorkProcess = (): Service[] => {
  return [
    {
      id: "1",
      title: "Design",
      description:
        "We analyze your current processes, identify automation opportunities, and create a comprehensive roadmap for transformation.",
      icon: "🔍",
      features: ["Process Mapping", "Opportunity Assessment", "ROI Analysis", "Implementation Roadmap"],
    },
    {
      id: "2",
      title: "Refine",
      description:
        "We develop a detailed strategy and implementation plan tailored to your business needs and technical requirements.",
      icon: "📋",
      features: ["Technical Architecture", "Resource Planning", "Timeline Development", "Risk Assessment"],
    },
    {
      id: "3",
      title: "Automate",
      description:
        "Our experts design and develop tailored AI solutions that integrate seamlessly with your existing systems and workflows.",
      icon: "⚙️",
      features: ["Custom AI Models", "System Integration", "API Development", "Quality Assurance"],
    },
    {
      id: "4",
      title: "Orchestrate",
      description:
        "We deploy your automation solutions and provide ongoing support to ensure optimal performance and continuous improvement.",
      icon: "🚀",
      features: ["Deployment", "Training", "24/7 Support", "Performance Monitoring"],
    },
  ]
}
