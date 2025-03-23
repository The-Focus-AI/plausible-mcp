# Plausible Analytics MCP Integration Project Brief

## Project Overview

A Model Context Protocol (MCP) server that enables natural language querying of Plausible Analytics data. This integration allows users to ask questions about their website analytics in plain English and receive accurate, real-time data from Plausible Analytics.

## Core Requirements

### Functionality

1. Natural Language Query Support

   - Convert natural language questions into Plausible Analytics API calls
   - Focus on common analytics queries first:
     - Traffic sources
     - Geographic data
     - Page views and visitor metrics
   - Support for time-based queries

2. Real-time Data Fetching

   - Always fetch fresh data for each query
   - No caching implementation to ensure data accuracy

3. Authentication & Security

   - Support two authentication methods:
     - Environment variables (PLAUSIBLE_API_KEY)
     - 1Password integration
   - Secure API key handling

4. Error Handling
   - Provide detailed error messages for:
     - API unavailability
     - Rate limiting issues
     - Invalid query mapping
     - Authentication failures
   - Clear, user-friendly error reporting

## Technical Specifications

### API Integration

- Plausible Analytics API v2
- Base URL: https://plausible.io/api/v2
- Available Metrics:
  - visitors
  - visits
  - pageviews
  - views_per_visit
  - bounce_rate
  - visit_duration
  - events

### Supported Dimensions

1. Event Dimensions:

   - event:name
   - event:page
   - event:page.pathname

2. Visit Dimensions:

   - visit:source
   - visit:referrer
   - visit:utm\_\* (medium, source, campaign)
   - visit:device
   - visit:browser
   - visit:os
   - visit:country
   - visit:region
   - visit:city

3. Time Dimensions:
   - minute
   - hour
   - date
   - week
   - month

### Implementation Details

- TypeScript-based implementation
- Zod validation for type safety
- MCP server architecture
- Standard I/O based transport layer

## Development Guidelines

1. Code Quality

   - Strong typing with TypeScript
   - Comprehensive error handling
   - Clear logging and debugging support

2. Testing Strategy
   - Unit tests for query parsing
   - Integration tests for API communication
   - Error handling verification

## Future Considerations

1. Potential Enhancements

   - Query caching for performance
   - Advanced analytics queries
   - Custom metric support
   - Comparison queries
   - Automated insights

2. Performance Optimization
   - Rate limiting management
   - Query optimization
   - Response formatting improvements

## Success Criteria

1. Accurate query interpretation
2. Reliable data retrieval
3. Clear error messaging
4. Response time under 2 seconds
5. User-friendly natural language understanding
