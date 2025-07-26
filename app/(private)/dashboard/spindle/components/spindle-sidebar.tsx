import React, { useState } from "react";

const sections = [
  { key: "nodesEdges", label: "Nodes & Edges", icon: "link" },
  { key: "canvas", label: "Canvas", icon: "map" },
  { key: "nodeFeatures", label: "Node Features", icon: "widgets" },
  { key: "edgeFeatures", label: "Edge Features", icon: "timeline" },
  { key: "interaction", label: "Interaction", icon: "touch_app" },
  { key: "advanced", label: "Advanced", icon: "settings" },
  { key: "info", label: "Info", icon: "info" },
];

function NodesEdgesPanel() {
  return (
    <div className="p-4 text-sm">
      {/* OPTIONS */}
      <div className="mb-6">
        <h2 className="font-semibold text-xs text-gray-500 mb-2">OPTIONS</h2>
        <div className="mb-2">
          <label className="block text-xs mb-1">Handle Positions</label>
          <select className="w-full border rounded px-2 py-1">
            <option>top-bottom</option>
            <option>left-right</option>
            <option>all</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">Floating Edges</span>
          <input type="checkbox" className="accent-pink-500" />
        </div>
      </div>
      {/* NODES & EDGES */}
      <div className="mb-6">
        <h2 className="font-semibold text-xs text-gray-500 mb-2">NODES & EDGES</h2>
        <div className="mb-2">
          <label className="block text-xs mb-1">Dataset</label>
          <select className="w-full border rounded px-2 py-1">
            <option>Custom</option>
            <option>Default</option>
            <option>Example</option>
          </select>
        </div>
        <button className="w-full py-1 text-pink-600 border border-pink-200 rounded mb-2">+ Add new node</button>
      </div>
      {/* NODE INSPECTOR */}
      <div className="mb-6">
        <h2 className="font-semibold text-xs text-gray-500 mb-2">NODE INSPECTOR</h2>
        <div className="mb-2">
          <label className="block text-xs mb-1">ID</label>
          <input className="w-full border rounded px-2 py-1" />
        </div>
        <div className="mb-2">
          <label className="block text-xs mb-1">Label</label>
          <input className="w-full border rounded px-2 py-1" />
        </div>
        <div className="mb-2 flex gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1">Target Handles</label>
            <input className="w-full border rounded px-2 py-1" />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1">Source Handles</label>
            <input className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="mb-2 flex gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1">Position</label>
            <input className="w-full border rounded px-2 py-1" />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1">z-index</label>
            <input className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="mb-2 flex gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1">Width</label>
            <input className="w-full border rounded px-2 py-1" />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1">Height</label>
            <input className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="mb-2 flex gap-2">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs">Connectable</span>
            <input type="checkbox" className="accent-pink-500" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs">Draggable</span>
            <input type="checkbox" className="accent-pink-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePanel({ activeSection }: { activeSection: string }) {
  switch (activeSection) {
    case "nodesEdges":
      return <NodesEdgesPanel />;
    case "canvas":
      return (
        <div className="p-4 text-sm space-y-6">
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">CANVAS OPTIONS</h2>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Pan</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Zoom</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Fit View</span>
              <button className="px-2 py-1 border rounded text-xs text-pink-600 border-pink-200 hover:bg-pink-50">Fit</button>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Background</span>
              <select className="border rounded px-2 py-1 text-xs">
                <option value="dots">Dots</option>
                <option value="lines">Lines</option>
                <option value="cross">Cross</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Grid Size</span>
              <input type="number" min={1} max={50} defaultValue={12} className="border rounded px-2 py-1 w-16 text-xs" />
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">MINIMAP & CONTROLS</h2>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Show MiniMap</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Show Controls</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Attribution</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
          </div>
        </div>
      );
    case "nodeFeatures":
      return (
        <div className="p-4 text-sm space-y-6">
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">NODE FEATURES</h2>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Resizable</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Draggable</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Selectable</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Editable Label</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Node Types</span>
              <select className="border rounded px-2 py-1 text-xs">
                <option>Default</option>
                <option>Input</option>
                <option>Output</option>
                <option>Custom</option>
              </select>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Node Toolbar</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Node Inspector</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
          </div>
        </div>
      );
    case "edgeFeatures":
      return (
        <div className="p-4 text-sm space-y-6">
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">EDGE FEATURES</h2>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Edge Types</span>
              <select className="border rounded px-2 py-1 text-xs">
                <option>Straight</option>
                <option>Bezier</option>
                <option>Step</option>
                <option>SmoothStep</option>
                <option>Custom</option>
              </select>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Animated</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Updatable</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Selectable</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Deletable</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Edge Label</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
          </div>
        </div>
      );
    case "interaction":
      return (
        <div className="p-4 text-sm space-y-6">
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">INTERACTION</h2>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Multi-Select</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Drag to Select</span>
              <input type="checkbox" className="accent-pink-500" defaultChecked />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Keyboard Shortcuts</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Context Menu</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Snap to Grid</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Auto Pan</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
          </div>
        </div>
      );
    case "advanced":
      return (
        <div className="p-4 text-sm space-y-6">
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">ADVANCED</h2>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Custom Node Types</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Custom Edge Types</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Programmatic API</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Devtools</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Export/Import</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs">Undo/Redo</span>
              <input type="checkbox" className="accent-pink-500" />
            </div>
          </div>
        </div>
      );
    case "info":
      return (
        <div className="p-4 text-sm space-y-6">
          <div>
            <h2 className="font-semibold text-xs text-gray-500 mb-2">INFO</h2>
            <div className="mb-2 text-xs text-gray-700">
              <p>React Flow version: <span className="font-mono">12.x</span></p>
              <p>Docs: <a href="https://reactflow.dev/" className="text-pink-600 underline" target="_blank" rel="noopener noreferrer">reactflow.dev</a></p>
              <p>GitHub: <a href="https://github.com/xyflow/xyflow" className="text-pink-600 underline" target="_blank" rel="noopener noreferrer">xyflow/xyflow</a></p>
              <p>License: MIT</p>
              <p className="mt-2">This sidebar is a demo of all major React Flow features. Use the toggles to explore available options.</p>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function SpindleSidebar({
  featurePanelOpen,
  onToggleFeaturePanel,
  activeSection,
  setActiveSection,
}: {
  featurePanelOpen: boolean;
  onToggleFeaturePanel: () => void;
  activeSection: string;
  setActiveSection: (key: string) => void;
}) {
  // Height of top nav is h-16 (4rem)
  return (
    <>
      {/* Icon bar, always visible, fixed to right, below top nav */}
      <nav
        className="fixed right-0 top-16 z-40 flex flex-col items-center py-4 px-2 gap-2 bg-white border-l shadow h-[calc(100vh-4rem)]"
        style={{ width: 56 }} // w-14
      >
        {sections.map((section) => (
          <button
            key={section.key}
            className={`w-10 h-10 flex items-center justify-center rounded-lg mb-1 relative group ${activeSection === section.key ? "bg-pink-100 text-pink-600" : "text-gray-400 hover:bg-gray-100"}`}
            title={section.label}
            onClick={() => {
              if (activeSection === section.key && featurePanelOpen) {
                onToggleFeaturePanel(); // collapse if already open
              } else {
                setActiveSection(section.key);
                if (!featurePanelOpen) onToggleFeaturePanel();
              }
            }}
          >
            <span className="material-symbols-outlined text-xl">{section.icon}</span>
            {/* Tooltip on hover: icon name */}
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity duration-200">
              {section.icon}
            </span>
          </button>
        ))}
      </nav>
      {/* Feature panel, expands/collapses to left of icon bar, below top nav */}
      {featurePanelOpen && (
        <div
          className="fixed top-16 right-14 z-30 h-[calc(100vh-4rem)] w-96 bg-white border-l shadow-lg flex flex-col"
        >
          <div className="flex-1 overflow-y-auto">
            <FeaturePanel activeSection={activeSection} />
          </div>
        </div>
      )}
    </>
  );
}
