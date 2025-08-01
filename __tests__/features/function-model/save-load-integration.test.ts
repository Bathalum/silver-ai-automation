import { render, screen, waitFor } from '@testing-library/react'
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

describe('Function Model Save/Load Integration Tests', () => {
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
  })

  describe('Save Functionality', () => {
    it('should save a function model successfully', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn().mockResolvedValue({
        ...testModel,
        lastSavedAt: new Date()
      })
      
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

      // Verify save was successful
      expect(mockSaveModel).toHaveBeenCalledWith(testModel, {})
    })

    it('should save with custom options', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn().mockResolvedValue({
        ...testModel,
        lastSavedAt: new Date()
      })
      
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

      // Click manual save with options
      const manualSaveButton = screen.getByText(/manual save/i)
      await userEvent.click(manualSaveButton)

      // Enter change summary
      const changeSummaryInput = screen.getByLabelText(/change summary/i)
      await userEvent.type(changeSummaryInput, 'Updated model structure')

      // Enable auto-versioning
      const autoVersionCheckbox = screen.getByLabelText(/auto-version/i)
      await userEvent.click(autoVersionCheckbox)

      // Confirm save
      const confirmSaveButton = screen.getByText(/confirm/i)
      await userEvent.click(confirmSaveButton)

      expect(mockSaveModel).toHaveBeenCalledWith(
        testModel,
        expect.objectContaining({
          changeSummary: 'Updated model structure',
          autoVersion: true
        })
      )
    })

    it('should handle save errors gracefully', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn().mockRejectedValue(new Error('Database connection failed'))
      
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
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument()
      })
    })

    it('should show save progress indicator', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      let resolveSave: (value: any) => void
      const savePromise = new Promise((resolve) => {
        resolveSave = resolve
      })
      const mockSaveModel = jest.fn().mockReturnValue(savePromise)
      
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

      // Start save
      const saveButton = screen.getByText('Save')
      await userEvent.click(saveButton)

      // Should show loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument()

      // Resolve save
      resolveSave!({ ...testModel, lastSavedAt: new Date() })

      await waitFor(() => {
        expect(screen.queryByText(/saving/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Load Functionality', () => {
    it('should load a function model on component mount', async () => {
      const mockLoadModel = jest.fn().mockResolvedValue(createTestModel('Loaded Model', 'Loaded Description'))
      
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

    it('should display loaded model information', async () => {
      const loadedModel = createTestModel('Loaded Model', 'Loaded Description')
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: loadedModel,
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

      // Verify model information is displayed
      expect(screen.getByText('Loaded Model')).toBeInTheDocument()
      expect(screen.getByText('Loaded Description')).toBeInTheDocument()
    })

    it('should handle load errors gracefully', async () => {
      const mockLoadModel = jest.fn().mockRejectedValue(new Error('Model not found'))
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: null,
        loading: false,
        error: 'Model not found',
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

      expect(screen.getByText('Model not found')).toBeInTheDocument()
    })

    it('should show loading state while loading model', async () => {
      let resolveLoad: (value: any) => void
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve
      })
      const mockLoadModel = jest.fn().mockReturnValue(loadPromise)
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: null,
        loading: true,
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

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Auto-Save Functionality', () => {
    it('should enable auto-save by default', () => {
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

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Check if auto-save is enabled
      const autoSaveToggle = screen.getByLabelText(/auto-save/i)
      expect(autoSaveToggle).toBeChecked()
    })

    it('should allow toggling auto-save', async () => {
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

      // Toggle auto-save off
      const autoSaveToggle = screen.getByLabelText(/auto-save/i)
      await userEvent.click(autoSaveToggle)

      expect(mockSetAutoSave).toHaveBeenCalledWith(false)
    })

    it('should allow changing save interval', async () => {
      const mockSetSaveInterval = jest.fn()
      
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
        setSaveInterval: mockSetSaveInterval,
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

      // Change save interval
      const intervalInput = screen.getByLabelText(/save interval/i)
      await userEvent.clear(intervalInput)
      await userEvent.type(intervalInput, '60')

      expect(mockSetSaveInterval).toHaveBeenCalledWith(60)
    })
  })

  describe('Version Control Integration', () => {
    it('should create version snapshots on save', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      const mockSaveModel = jest.fn().mockResolvedValue({
        ...testModel,
        version: '1.1.0',
        lastSavedAt: new Date()
      })
      
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

      // Save with versioning
      const manualSaveButton = screen.getByText(/manual save/i)
      await userEvent.click(manualSaveButton)

      const changeSummaryInput = screen.getByLabelText(/change summary/i)
      await userEvent.type(changeSummaryInput, 'Added new nodes')

      const autoVersionCheckbox = screen.getByLabelText(/auto-version/i)
      await userEvent.click(autoVersionCheckbox)

      const confirmSaveButton = screen.getByText(/confirm/i)
      await userEvent.click(confirmSaveButton)

      expect(mockSaveModel).toHaveBeenCalledWith(
        testModel,
        expect.objectContaining({
          changeSummary: 'Added new nodes',
          autoVersion: true
        })
      )
    })

    it('should display version information', async () => {
      const testModel = createTestModel('Test Model', 'Test Description')
      testModel.version = '1.2.0'
      testModel.currentVersion = '1.2.0'
      
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

      // Check if version is displayed
      expect(screen.getByText(/v1\.2\.0/i)).toBeInTheDocument()
    })
  })

  describe('Data Persistence Verification', () => {
    it('should preserve all model data through save/load cycle', async () => {
      const originalModel = createTestModel('Original Model', 'Original Description')
      originalModel.nodesData = [
        {
          id: 'node-1',
          type: 'default',
          position: { x: 100, y: 100 },
          data: { label: 'Test Node' }
        }
      ]
      originalModel.edgesData = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'default'
        }
      ]
      originalModel.metadata = {
        category: 'business',
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          autoSave: true,
          requireApproval: false,
          saveInterval: 30
        },
        dependencies: ['dependency-1'],
        exportSettings: {
          format: 'json',
          includeMetadata: true,
          includeRelationships: true,
          resolution: 'high'
        },
        references: ['ref-1', 'ref-2']
      }

      const mockSaveModel = jest.fn().mockResolvedValue(originalModel)
      const mockLoadModel = jest.fn().mockResolvedValue(originalModel)
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: originalModel,
        loading: false,
        error: null,
        autoSave: true,
        saveInterval: 30,
        loadModel: mockLoadModel,
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

      // Save the model
      const saveButton = screen.getByText('Save')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSaveModel).toHaveBeenCalledWith(originalModel, {})
      })

      // Verify all data is preserved
      const savedModel = mockSaveModel.mock.calls[0][0]
      expect(savedModel.nodesData).toEqual(originalModel.nodesData)
      expect(savedModel.edgesData).toEqual(originalModel.edgesData)
      expect(savedModel.metadata).toEqual(originalModel.metadata)
    })

    it('should handle large datasets efficiently', async () => {
      const largeModel = createTestModel('Large Model', 'Large Description')
      
      // Create large dataset
      largeModel.nodesData = Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        type: 'default',
        position: { x: i * 10, y: i * 10 },
        data: { label: `Node ${i}` }
      }))
      
      largeModel.edgesData = Array.from({ length: 500 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
        type: 'default'
      }))

      const mockSaveModel = jest.fn().mockResolvedValue(largeModel)
      
      mockUseFunctionModelPersistence.mockReturnValue({
        model: largeModel,
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

      const startTime = performance.now()

      render(
        <ReactFlowProvider>
          <FunctionProcessDashboard />
        </ReactFlowProvider>
      )

      // Save large model
      const saveButton = screen.getByText('Save')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSaveModel).toHaveBeenCalled()
      })

      const endTime = performance.now()
      const saveTime = endTime - startTime

      // Should save within reasonable time
      expect(saveTime).toBeLessThan(5000) // 5 seconds
      expect(mockSaveModel).toHaveBeenCalledWith(largeModel, {})
    })
  })
}) 