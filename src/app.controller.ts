import { Controller, Get, Post, Body } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("ping")
  ping(): any {
    return { data: this.appService.getPing() };
  }

  @Post("api/calculate-route")
  async calculateRoute(@Body() data) {
    const source = data.source;
    const destination = data.destination;
    return this.appService.calculateRoute(source, destination);
  }

  @Post("api/calculate-path")
  async calculatePath(@Body() data) {
    const source = data.source;
    const destination = data.destination;
    const mode = data.mode;
    return this.appService.calculatePath(source, destination, mode);
  }
}
