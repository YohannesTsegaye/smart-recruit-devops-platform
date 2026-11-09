# Smart Recruit Frontend

A React-based frontend application for the Smart Recruit job application system.

## Features

- User authentication and authorization
- Job posting browsing and application
- Admin dashboard for candidate management
- Real-time status updates
- File upload for resumes
- Responsive design with Tailwind CSS
- Modern UI with React components

## Tech Stack

- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **Icons**: Lucide React, Heroicons
- **Notifications**: React Hot Toast, React Toastify
- **Charts**: Recharts

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running (see backend repository)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/frontend.git
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Smart Recruit

# Development
VITE_NODE_ENV=development
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:3001 |
| `VITE_APP_NAME` | Application name | Smart Recruit |
| `VITE_NODE_ENV` | Environment | development |

## Project Structure

```
src/
├── assets/          # Static assets and icons
├── component/       # Reusable components
│   ├── auth/       # Authentication components
│   ├── comm/       # Common components (header, footer)
│   └── dashboard/  # Dashboard components
├── context/        # React context providers
├── hooks/          # Custom React hooks
├── layout/         # Layout components
├── main function/  # Main application features
│   ├── Application/
│   ├── file Upload/
│   ├── Filters/
│   ├── jobs/
│   ├── notification/
│   ├── report/
│   └── tracking/
├── pages/          # Page components
├── routes/         # Routing configuration
├── services/       # API services
├── style/          # Global styles
└── utils/          # Utility functions
```

## API Integration

The frontend communicates with the backend API through services located in `src/services/`:

### Authentication Service
- Login/logout functionality
- JWT token management
- Password reset

### Jobs Service
- Fetch job postings
- Submit job applications
- File upload for resumes

### Candidates Service
- Admin dashboard for candidate management
- Status updates
- Filtering and search

### Dashboard Service
- Analytics and statistics
- Report generation

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Development Workflow

1. **Start the backend server** (see backend repository)
2. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
3. **Access the application** at `http://localhost:5173`

### API Communication

The frontend uses Axios for API communication. The base configuration is in `src/services/api.js`:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## Deployment

### Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

### Environment Variables for Production

Set the following environment variables in your deployment platform:

- `VITE_API_URL` - Your production backend URL
- `VITE_APP_NAME` - Application name

## CORS Configuration

Ensure your backend CORS settings allow requests from your frontend domain. Update the backend CORS configuration in `src/main.ts`:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **API Connection Error**: Ensure the backend server is running and the `VITE_API_URL` is correct
2. **CORS Error**: Check backend CORS configuration
3. **Build Errors**: Clear node_modules and reinstall dependencies

### Development Tips

- Use React DevTools for debugging
- Check the browser console for API errors
- Use the Network tab to monitor API requests
- Enable source maps for better debugging

## License

This project is licensed under the MIT License.