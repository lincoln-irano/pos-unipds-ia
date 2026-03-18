import { createServer } from "./server.ts";
import { config } from "./config.ts";
import { OpenRouterService } from "./openrouterService.ts";

const routerService = new OpenRouterService(config)
const app = createServer(routerService)

await app.listen({ port: 3000, host: '0.0.0.0' })

app.inject({
  method: 'POST',
  url: '/chat',
  body: { question: 'What is rate limiting?' }
}).then((response) => {
  console.log('Response status', response.statusCode)
  console.log('Response body', response.body)
})