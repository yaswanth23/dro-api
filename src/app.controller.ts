import { Controller, Get, Post, Body } from "@nestjs/common";
import { AppService } from "./app.service";

interface Coordinates {
  lat: number;
  lng: number;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("ping")
  ping(): any {
    return { data: this.appService.getPing() };
  }

  @Post("api/calculate-route")
  async calculateRoute(@Body() data: { coordinates: Coordinates[] }) {
    return this.appService.calculateRoute(data);
  }

  @Post("api/twoOpt/calculate-route")
  async calculateRouteOpt(
    @Body() data: { startLocation: { lat: number; lng: number } }
  ) {
    return this.appService.twoOpt(data.startLocation);
  }
}
