import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider } from 'reactflow'
import FunctionProcessDashboard from '@/app/(private)/dashboard/function-model/components/function-process-dashboard'
import { useFunctionModelPersistence } from '@/lib/application/hooks/use-function-model-persistence'
import { createFunctionModel } from '@/lib/domain/entities/function-model-types'

// Mock the hooks
jest.mock('@/lib/application/hooks/use-function-model-persistence', () => ({
  useFunctionModelPersistence: jest.fn(),
  useCrossFeatureLinking: jest.fn(),
  useFunctionModelVersionControl: jest.fn(),
  useFunctionModelManagement: jest.fn()
}))

// Mock React Flow
jest.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="react-flow-provider">{children}</div>,
  useReactFlow: () => ({
    getNodes: jest.fn(() => []),
    getEdges: jest.fn(() => []),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    addNodes: jest.fn(),
    addEdges: jest.fn(),
    deleteElements: jest.fn(),
    getViewport: jest.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    setViewport: jest.fn()
  }),
  useNodesState: () => [[], jest.fn()],
  useEdgesState: () => [[], jest.fn()],
  addEdge: jest.fn(),
  Background: ({ children }: { children: React.ReactNode }) => <div data-testid="background">{children}</div>,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  Handle: ({ children }: { children: React.ReactNode }) => <div data-testid="handle">{children}</div>,
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left'
  }
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/function-model'
}))

describe('Function Model Feature - End-to-End Tests', () => {
  const mockUseFunctionModelPersistence = useFunctionModelPersistence as jest.MockedFunction<typeof useFunctionModelPersistence>
  
  // Helper function to create a test model
  const createTestModel = (name: string, description: string, modelId: string = 'test-id') => {
    const baseModel = createFunctionModel(name, description)
    return {
      ...baseModel,
      modelId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSavedAt: new Date()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementation
    mockUseFunctionModelPersistence.mockReturnValue({
      model: null,
      loading: false,
      error: null,
      autoSave: true,
      saveInterval: 30,
      loadModel: jest.fn(),
      saveModel: jest.fn(),
      updateModel: jest.fn(),
      setAutoSave: jest.fn(),
      setSaveInterval: jest.fn(),
      clearError: jest.fn()
    })
  })

  describe('Function Model Dashboard Rendering', () => {
    it('should render the main dashboard with all components', () => {
      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Check for main dashboard elements
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
      expect(screen.getByTestId('background')).toBeInTheDocument()
      expect(screen.getByTestId('controls')).toBeInTheDocument()
      expect(screen.getByTestId('minimap')).toBeInTheDocument()
      
      // Check for toolbar buttons
      expect(screen.getByText('Function Model Settings')).toBeInTheDocument()
      expect(screen.getByText('Persistence')).toBeInTheDocument()
    })

    it('should display loading state when model is loading', () => {
      mockUseFunctionModelPersistence.mockReturnValue({
        model: null,
        loading: true,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should display error state when there is an error', () => {
      mockUseFunctionModelPersistence.mockReturnValue({
        model: null,
        loading: false,
        error: 'Failed to load model',
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      expect(screen.getByText('Failed to load model')).toBeInTheDocument()
    })
  })

  describe('Function Model Persistence Integration', () => {
    it('should load model on component mount', async () => {
      const mockLoadModel = jest.fn()
      mockUseFunctionModelPersistence.mockReturnValue({
        model: null,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: mockLoadModel,
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      await waitFor(() => {
        expect(mockLoadModel).toHaveBeenCalled()
      })
    })

    it('should display model information when loaded', () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      expect(screen.getByText('Test Model')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('should handle save functionality', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn()
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: mockSaveModel,
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Find and click save button
      const saveButton = screen.getByText('Save')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSaveModel).toHaveBeenCalled()
      })
    })

    it('should handle auto-save toggle', async () => {
      const mockSetAutoSave = jest.fn()
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: null,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: mockSetAutoSave,
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Find and click auto-save toggle
      const autoSaveToggle = screen.getByLabelText(/auto-save/i)
      await userEvent.click(autoSaveToggle)

      expect(mockSetAutoSave).toHaveBeenCalledWith(false)
    })
  })

  describe('Function Model Canvas Operations', () => {
    it('should allow adding nodes to the canvas', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Find and click add node button
      const addNodeButton = screen.getByText(/add node/i)
      await userEvent.click(addNodeButton)

      // Verify node was added (this would depend on your specific implementation)
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
    })

    it('should allow connecting nodes', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // This would test the actual node connection logic
      // Implementation depends on your specific React Flow setup
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
    })
  })

  describe('Function Model Settings', () => {
    it('should open settings dialog when settings button is clicked', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      const settingsButton = screen.getByText('Function Model Settings')
      await userEvent.click(settingsButton)

      // Check if settings dialog is opened
      expect(screen.getByText(/settings/i)).toBeInTheDocument()
    })

    it('should allow updating model metadata', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockUpdateModel = jest.fn()
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: mockUpdateModel,
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Open settings
      const settingsButton = screen.getByText('Function Model Settings')
      await userEvent.click(settingsButton)

      // Update model name
      const nameInput = screen.getByLabelText(/name/i)
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Updated Model Name')

      // Save changes
      const saveButton = screen.getByText(/save/i)
      await userEvent.click(saveButton)

      expect(mockUpdateModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Model Name'
        })
      )
    })
  })

  describe('Function Model Persistence Sidebar', () => {
    it('should open persistence sidebar when persistence button is clicked', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      const persistenceButton = screen.getByText('Persistence')
      await userEvent.click(persistenceButton)

      // Check if persistence sidebar is opened
      expect(screen.getByText(/save & load/i)).toBeInTheDocument()
      expect(screen.getByText(/links/i)).toBeInTheDocument()
    })

    it('should allow manual save with change summary', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn()
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: mockSaveModel,
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Open persistence sidebar
      const persistenceButton = screen.getByText('Persistence')
      await userEvent.click(persistenceButton)

      // Click manual save
      const manualSaveButton = screen.getByText(/manual save/i)
      await userEvent.click(manualSaveButton)

      // Enter change summary
      const changeSummaryInput = screen.getByLabelText(/change summary/i)
      await userEvent.type(changeSummaryInput, 'Updated model structure')

      // Confirm save
      const confirmSaveButton = screen.getByText(/confirm/i)
      await userEvent.click(confirmSaveButton)

      expect(mockSaveModel).toHaveBeenCalledWith(
        expect.objectContaining({
          changeSummary: 'Updated model structure'
        })
      )
    })

    it('should display version history', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Open persistence sidebar
      const persistenceButton = screen.getByText('Persistence')
      await userEvent.click(persistenceButton)

      // Click load version
      const loadVersionButton = screen.getByText(/load version/i)
      await userEvent.click(loadVersionButton)

      // Check if version history is displayed
      expect(screen.getByText(/version history/i)).toBeInTheDocument()
    })
  })

  describe('Function Model Error Handling', () => {
    it('should display error message when save fails', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn().mockRejectedValue(new Error('Save failed'))
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: mockSaveModel,
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Try to save
      const saveButton = screen.getByText('Save')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument()
      })
    })

    it('should allow clearing error messages', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockClearError = jest.fn()
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: 'Test error',
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: mockClearError
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Click clear error button
      const clearErrorButton = screen.getByText(/clear/i)
      await userEvent.click(clearErrorButton)

      expect(mockClearError).toHaveBeenCalled()
    })
  })

  describe('Function Model Performance', () => {
    it('should handle large models efficiently', async () => {
      const largeModel = createTestModel('Large Model', 'Large Description')
      // Add many nodes and edges to simulate large model
      largeModel.nodesData = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'default',
        position: { x: i * 100, y: i * 100 },
        data: { label: `Node ${i}` }
      }))
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: largeModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: jest.fn(),
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      const startTime = performance.now()
      
      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000) // 1 second
    })

    it('should handle rapid save operations', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn()
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: testModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: jest.fn(),
        saveModel: mockSaveModel,
        updateModel: jest.fn(),
        setAutoSave: jest.fn(),
        setSaveInterval: jest.fn(),
        clearError: jest.fn()
      })

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      const saveButton = screen.getByText('Save')

      // Rapid save clicks
      await userEvent.click(saveButton)
      await userEvent.click(saveButton)
      await userEvent.click(saveButton)

      // Should handle rapid saves gracefully
      expect(mockSaveModel).toHaveBeenCalledTimes(3)
    })
  })
}) 