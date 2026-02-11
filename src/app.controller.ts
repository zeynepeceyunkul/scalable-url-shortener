import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      name: "URL Shortener API",
      version: "1.0",
      docs: "API endpoints:",
      endpoints: {
        auth: {
          "POST /auth/register": "Register (body: email, password)",
          "POST /auth/login": "Login (body: email, password)",
        },
        links: {
          "POST /links": "Create short link (auth required)",
          "GET /links": "List my links (auth required)",
          "PATCH /links/:id": "Update link (auth required)",
        },
        redirect: {
          "GET /r/:code": "Redirect to original URL",
        },
      },
      health: "ok",
    };
  }
}
