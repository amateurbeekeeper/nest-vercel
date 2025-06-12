import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

let server: any; // will hold the Express server instance

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle("Figma Copy Updater API")
    .setDescription("API for updating text using OpenAI's GPT-4")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  await app.init(); // do not app.listen(), just initialize the app
  server = app.getHttpAdapter().getInstance();
}

// If not on Vercel, start the server normally (for local dev)
if (!process.env.VERCEL_REGION && !process.env.NOW_REGION) {
  bootstrap().then(() => console.log("Nest app listening..."));
}

// Vercel will invoke this exported function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!server) {
    await bootstrap(); // cold start initialization
  }
  server(req, res); // let Nest (Express) handle the request
}
