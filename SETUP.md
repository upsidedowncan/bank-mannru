# Bank Mannru - Setup Guide

## Installed Packages

The following packages have been installed and configured:

### UI & Styling
- **@mui/material** - Material-UI components
- **@emotion/react** & **@emotion/styled** - CSS-in-JS styling
- **@mui/icons-material** - Material Design icons

### Backend & API
- **@supabase/supabase-js** - Supabase client for backend services
- **axios** - HTTP client for API requests

### Forms & Validation
- **react-hook-form** - Form handling
- **@hookform/resolvers** - Form validation resolvers
- **zod** - Schema validation

### Routing
- **react-router-dom** - Client-side routing
- **@types/react-router-dom** - TypeScript types for React Router

### Utilities
- **date-fns** - Date manipulation utilities

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration (optional)
REACT_APP_API_URL=http://localhost:3001

# Other Configuration
REACT_APP_ENVIRONMENT=development
```

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   └── AppLayout.tsx          # Main application layout
│   └── Forms/
│       └── LoginForm.tsx          # Login form component
├── config/
│   └── supabase.ts               # Supabase client configuration
├── theme/
│   └── theme.ts                  # MUI theme configuration
├── utils/
│   ├── api.ts                    # Axios API configuration
│   └── validation.ts             # Zod validation schemas
└── App.tsx                       # Main application component
```

## Features Included

### 1. Material-UI Theme
- Custom theme with primary/secondary colors
- Responsive typography
- Custom component styling

### 2. Layout System
- Responsive sidebar navigation
- Mobile-friendly drawer
- App bar with navigation

### 3. Form Handling
- React Hook Form integration
- Zod validation schemas
- Error handling and display

### 4. API Configuration
- Axios instance with interceptors
- Authentication token handling
- Error response handling

### 5. Routing
- React Router setup
- Nested routes with layout
- Navigation between pages

## Getting Started

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy the environment variables above to a `.env` file
   - Add your Supabase project credentials

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   - Main app: http://localhost:3000
   - Login page: http://localhost:3000/login

## Next Steps

1. **Set up Supabase**:
   - Create a Supabase project
   - Add your project URL and anon key to `.env`
   - Set up your database schema

2. **Implement authentication**:
   - Connect login form to Supabase Auth
   - Add protected routes
   - Implement user session management

3. **Add more features**:
   - Dashboard widgets
   - Account management
   - Payment processing
   - User profile management

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App 