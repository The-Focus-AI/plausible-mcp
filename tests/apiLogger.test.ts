import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApiLogger } from '../src/utils/apiLogger'

// Mock the fs module
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}))

// Import fs after mocking
import * as fs from 'fs'

describe('ApiLogger', () => {
  let logger: ApiLogger
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    // Mock console methods before creating logger
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Enable API debugging for tests
    process.env.API_DEBUG = 'true'
    
    // Create a new logger instance after setting up the environment
    logger = new ApiLogger('test-service')
  })

  afterEach(() => {
    // Clean up environment after each test
    delete process.env.API_DEBUG
    vi.restoreAllMocks()
  })

  it('should initialize with debug logging enabled', () => {
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '🔍 API Debug logging enabled for test-service'
    )
  })

  it('should log successful API calls', () => {
    logger.logApiCall('/test', { param: 'value' }, { success: true })

    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('📝 API debug log written to:')
    )
  })

  it('should log API calls with errors', () => {
    const error = new Error('Test error')
    logger.logApiCall('/test', { param: 'value' }, null, error)

    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('📝 API debug log written to:')
    )
  })

  it('should handle undefined parameters', () => {
    logger.logApiCall('/test', undefined, undefined)

    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('📝 API debug log written to:')
    )
  })

  it('should handle null response', () => {
    logger.logApiCall('/test', {}, null)

    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('📝 API debug log written to:')
    )
  })

  it('should format error objects correctly', () => {
    const error = new Error('Test error')
    logger.logApiCall('/test', {}, null, error)

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"message": "Test error"')
    )
  })

  it('should handle file system errors', () => {
    // Mock fs.writeFileSync to throw an error
    vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
      throw new Error('Failed to write file')
    })

    logger.logApiCall('/test', {}, { success: true })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error writing API debug log:',
      expect.any(Error)
    )
  })

  it('should not log when debugging is disabled', () => {
    process.env.API_DEBUG = 'false'
    logger = new ApiLogger('test-service')
    logger.logApiCall('/test', {}, { success: true })

    expect(fs.writeFileSync).not.toHaveBeenCalled()
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('📝 API debug log written to:')
    )
  })
}) 