import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PlausibleClient } from '../src/plausibleClient'
import type { PlausibleBreakdownParams, PlausibleBreakdownResult } from '../src/types/plausible'

// Mock fetch globally
const fetchMock = vi.fn()
global.fetch = fetchMock

describe('PlausibleClient', () => {
  let client: PlausibleClient
  let consoleErrorSpy: any

  beforeEach(() => {
    client = new PlausibleClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://plausible.io/api/v1'
    })
    // Reset fetch mock before each test
    fetchMock.mockReset()
    // Mock console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error after each test
    vi.restoreAllMocks()
  })

  it('should use default baseUrl when not provided', async () => {
    const clientWithDefaultUrl = new PlausibleClient({
      apiKey: 'test-api-key'
    })

    const mockSites = [{ id: 'site1.com', name: 'Site 1' }]
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSites)
    })

    await clientWithDefaultUrl.getSites()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://plausible.io/api/v1/sites',
      expect.any(Object)
    )
  })

  describe('getBreakdown', () => {
    // Test case 1: Most visited pages in last 7 days
    it('should fetch most visited pages correctly', async () => {
      const mockResponse: PlausibleBreakdownResult = {
        results: [
          { page: '/home', pageviews: 1000 },
          { page: '/about', pageviews: 500 }
        ]
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page',
        period: '7d'
      }

      const result = await client.getBreakdown(params)
      expect(result).toEqual(mockResponse)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/stats/breakdown'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key'
          })
        })
      )
    })

    // Test case 2: Traffic sources breakdown
    it('should fetch traffic sources correctly', async () => {
      const mockResponse: PlausibleBreakdownResult = {
        results: [
          { source: 'Google', visitors: 800 },
          { source: 'Direct', visitors: 400 }
        ]
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'visit:source',
        period: '30d'
      }

      const result = await client.getBreakdown(params)
      expect(result).toEqual(mockResponse)
    })

    // Test case 3: Visitor count by country
    it('should fetch visitor counts by country correctly', async () => {
      const mockResponse: PlausibleBreakdownResult = {
        results: [
          { country: 'US', visitors: 1200 },
          { country: 'GB', visitors: 600 }
        ]
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'visit:country',
        period: 'month'
      }

      const result = await client.getBreakdown(params)
      expect(result).toEqual(mockResponse)
    })

    // Test case 4: Error handling
    it('should handle API errors correctly', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded')
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page'
      }

      await expect(client.getBreakdown(params)).rejects.toThrow('HTTP error!')
    })

    // Test case 5: Pagination handling
    it('should handle pagination correctly', async () => {
      const mockResponse: PlausibleBreakdownResult = {
        results: [{ page: '/home', pageviews: 1000 }],
        pagination: {
          page: 1,
          total_pages: 2
        }
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page',
        page: 1
      }

      const result = await client.getBreakdown(params)
      expect(result.pagination).toBeDefined()
      expect(result.pagination?.total_pages).toBe(2)
    })

    // Test case 6: Complex filters
    it('should handle complex filters correctly', async () => {
      const mockResponse: PlausibleBreakdownResult = {
        results: [
          { page: '/blog/post1', bounce_rate: 45 },
          { page: '/blog/post2', bounce_rate: 55 }
        ]
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page',
        filters: JSON.stringify([['contains', 'event:page', ['/blog']]])
      }

      const result = await client.getBreakdown(params)
      expect(result).toEqual(mockResponse)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('filters'),
        expect.any(Object)
      )
    })

    // Test case 7: Network error handling
    it('should handle network errors correctly', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page'
      }

      await expect(client.getBreakdown(params)).rejects.toThrow('Network error')
    })

    // Test case 8: Invalid JSON response
    it('should handle invalid JSON response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page'
      }

      await expect(client.getBreakdown(params)).rejects.toThrow('Invalid JSON')
    })

    it('should handle unknown error formats', async () => {
      // Mock fetch to throw a non-Error object
      fetchMock.mockRejectedValueOnce({ foo: 'bar' })

      await expect(client.getBreakdown({ site_id: 'example.com', property: 'event:page' })).rejects.toEqual({ foo: 'bar' })
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error making request:', { foo: 'bar' })
    })
  })

  describe('getAllBreakdownPages', () => {
    it('should fetch all pages when there is pagination', async () => {
      const page1: PlausibleBreakdownResult = {
        results: [{ page: '/page1', visitors: 100 }],
        pagination: { page: 1, total_pages: 2 }
      }
      
      const page2: PlausibleBreakdownResult = {
        results: [{ page: '/page2', visitors: 50 }],
        pagination: { page: 2, total_pages: 2 }
      }

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2)
        })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page'
      }

      const results = await client.getAllBreakdownPages(params)
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual(page1.results[0])
      expect(results[1]).toEqual(page2.results[0])
    })

    it('should handle errors in pagination', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Pagination error'))

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page'
      }

      await expect(client.getAllBreakdownPages(params)).rejects.toThrow('Pagination error')
    })

    it('should handle response without pagination', async () => {
      const response: PlausibleBreakdownResult = {
        results: [{ page: '/single', visitors: 100 }]
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response)
      })

      const params: PlausibleBreakdownParams = {
        site_id: 'example.com',
        property: 'event:page'
      }

      const results = await client.getAllBreakdownPages(params)
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual(response.results[0])
    })
  })

  describe('getSites', () => {
    it('should fetch all sites correctly', async () => {
      const mockSites = [
        { id: 'site1.com', name: 'Site 1' },
        { id: 'site2.com', name: 'Site 2' }
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSites)
      })

      const sites = await client.getSites()
      expect(sites).toEqual(mockSites)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/sites'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key'
          })
        })
      )
    })

    it('should handle network errors when fetching sites', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      await expect(client.getSites()).rejects.toThrow('Network error')
    })

    it('should handle API errors when fetching sites', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error')
      })

      await expect(client.getSites()).rejects.toThrow('HTTP error!')
    })
  })
}) 