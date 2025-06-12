# Figma Copy Updater API

A NestJS REST API that processes text updates using OpenAI's GPT-4. This API is designed to work with the Figma Copy Updater plugin.

## 🚀 Features

- 🔐 JWT Authentication
- 🤖 OpenAI GPT-4 Integration
- 📝 Text Processing with Comments and Prompts
- 📚 Swagger API Documentation
- 📊 Comprehensive Logging
- 🔒 API Key Protection

## 🏗️ Project Structure

```
figma-copy-updater-api/
├── src/
│   ├── main.ts            # NestJS bootstrap
│   ├── app.module.ts      # Root module
│   ├── auth/             # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── dto/
│   ├── text/             # Text processing module
│   │   ├── text.controller.ts
│   │   ├── text.service.ts
│   │   └── dto/
│   └── config/           # Configuration files
├── logs/                 # Log files
├── .env                  # Environment variables
└── package.json
```

## 🔧 Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=1d
OPENAI_API_KEY=your-openai-api-key
API_KEY=your-api-key
```

3. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000` with Swagger documentation at `http://localhost:3000/api`.

## 🔍 API Endpoints

### Authentication

#### Get JWT Token
```http
POST /auth/token
Content-Type: application/json

{
  "apiKey": "your-api-key"
}
```

Response:
```json
{
  "access_token": "your-jwt-token"
}
```

### Text Processing

#### Update Text
```http
POST /text/update
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "originalText": "The text to update",
  "comment": "Your comments about the text",
  "prompt": "Your instructions for the update"
}
```

Response:
```json
{
  "newText": "The updated text from OpenAI"
}
```

## 📖 Example Usage

1. First, get a JWT token:
```bash
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-api-key"}'
```

2. Use the token to update text:
```bash
curl -X POST http://localhost:3000/text/update \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "Welcome to our website",
    "comment": "Make it more engaging",
    "prompt": "Add excitement and call to action"
  }'
```

## 🛠️ Development

```bash
# Start development server with hot reload
npm run start:dev

# Build the project
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test

# Run linter
npm run lint
```

## 📊 Logging

Logs are stored in:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

## 🔒 Security

- All endpoints except `/auth/token` require JWT authentication
- API keys are required for JWT token generation
- OpenAI API key is stored securely in environment variables

## ⚠️ Error Handling

The API includes comprehensive error handling:
- Invalid authentication
- OpenAI API errors
- Invalid input validation
- Server errors

All errors are logged and returned with appropriate HTTP status codes.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details
