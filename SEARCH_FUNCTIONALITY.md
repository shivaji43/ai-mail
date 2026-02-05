# Email Search Functionality

## Overview
The AI Mail application now includes comprehensive email search functionality that allows users to search through their emails using Gmail's powerful search syntax.

## Features

### 1. Gmail API Search
- **Full Gmail Search**: Searches across all emails in your Gmail account, not just loaded emails
- **Gmail Search Syntax Support**: Supports Gmail's advanced search operators:
  - `from:john` - Find emails from John
  - `to:mary` - Find emails sent to Mary
  - `subject:meeting` - Find emails with "meeting" in subject
  - `has:attachment` - Find emails with attachments
  - `is:unread` - Find unread emails
  - `in:spam` - Search in spam folder
  - `after:2023/12/01` - Find emails after a specific date
  - `filename:pdf` - Find emails with PDF attachments

### 2. Smart Query Processing
- **Auto-exclusion**: Automatically excludes spam and trash unless explicitly searched
- **Natural Language**: Supports both natural language queries and Gmail syntax
- **Combined Queries**: Can combine multiple search terms

### 3. User Interface
- **Prominent Search Bar**: Located in the header for easy access
- **Search Results Category**: Dynamic category that appears when searching
- **Clear Search**: Easy way to clear search and return to normal view
- **Loading States**: Visual feedback during search operations

### 4. Search Integration
- **Pagination**: Search results support pagination for large result sets
- **Category Switching**: Seamless switching between search results and email categories
- **State Management**: Maintains search state while preserving category functionality

## How to Use

### Basic Search
1. Click on the search bar in the header
2. Type your search query (e.g., "meeting", "from:boss@company.com")
3. Press Enter or click the Search button
4. Results appear in the "Search Results" category

### Advanced Search Examples
- `from:support has:attachment` - Find emails from support with attachments
- `subject:invoice after:2023/12/01` - Find invoices from December 2023 onwards
- `is:unread important` - Find unread emails containing "important"
- `in:spam to:me` - Search for emails to you in spam folder

### Clearing Search
- Click the "X" button in the search bar
- Press Escape key while in search bar
- Switch to any other email category

## Technical Implementation

### API Enhancements
- Extended `/api/emails` route to support `search` parameter
- Smart query building that respects Gmail search syntax
- Separate caching for search results to improve performance

### State Management
- Added 'search' category to EmailCategory type
- Extended useEmails hook with searchEmails function
- Proper state transitions between search and regular modes

### UI Components
- New EmailSearch component with keyboard shortcuts
- Updated CategoryFilter to show search results when active
- Responsive design that works on all screen sizes

## Search Tips
1. **Use specific terms**: More specific searches return better results
2. **Combine operators**: Use multiple search operators for precise results
3. **Date ranges**: Use date operators to find emails from specific time periods
4. **Attachment search**: Use `has:attachment` or `filename:` for file searches
5. **Label search**: Use `label:` to search within specific Gmail labels

## Performance Notes
- Search results are cached to improve performance
- Pagination prevents loading too many results at once
- Smart caching invalidation ensures fresh results when needed