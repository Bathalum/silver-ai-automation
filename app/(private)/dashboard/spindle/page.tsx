"use client"

import { SpindleReactFlowCanvas } from "./components/spindle-reactflow-canvas";
import { SpindleSidebar } from "./components/spindle-sidebar";
import React from "react";

export default function SpindlePage() {
  // State for feature panel and active section
  const [featurePanelOpen, setFeaturePanelOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("nodesEdges");
  return (
    <div className="flex h-full w-full relative">
      {/* Main content/canvas */}
      <div className="flex-1 h-full relative">
        <SpindleReactFlowCanvas />
      </div>
      {/* Right icon bar and feature panel, now as a flex child, not fixed */}
      <div className="h-full flex flex-col z-30">
        <SpindleSidebar
          featurePanelOpen={featurePanelOpen}
          onToggleFeaturePanel={() => setFeaturePanelOpen((open) => !open)}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      </div>
    </div>
  );
}
