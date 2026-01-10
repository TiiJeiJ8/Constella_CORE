# Constella CORE API

Enterprise-grade backend API built with Node.js and TypeScript.

## Features

- 🚀 TypeScript for type safety
- 📦 Express.js framework
- 🔒 Security best practices (Helmet, CORS)
- 📝 Request logging with Morgan and Winston
- ✅ Input validation with Joi
- 🧪 Testing with Jest
- 📏 Code quality with ESLint and Prettier
- 🔄 Hot reload with Nodemon

## Project Structure

```
.
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   ├── types/           # TypeScript type definitions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── tests/               # Test files
├── dist/                # Compiled JavaScript (generated)
└── logs/                # Application logs (generated)
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration.

### Development

Run the development server with hot reload:
```bash
npm run dev
```

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Production

Run the compiled application:
```bash
npm start
```

Or with production environment:
```bash
npm run start:prod
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

### Code Quality

Lint code:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

Check formatting:
```bash
npm run format:check
```

## API Documentation

API will be available at: `http://localhost:3000/api/v1`

## License

ISC
