import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class AppService {
  getPing(): any {
    return {
      server_time: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      server_name: "delivery-route-optimizer-api",
      version: "1.0",
    };
  }

  async calculateRoute(
    source: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) {
    try {
      const apiKey = "AIzaSyC2znSVKp2NenYkrawAuAUv8V379X_V9WI";
      const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${source.lat},${source.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}`;

      const response = await axios.get(apiUrl);

      if (response.data.status === "OK") {
        const sourceAddresses = response.data.origin_addresses[0];
        const destinationAddresses = response.data.destination_addresses[0];

        const distance = response.data.rows[0]?.elements[0]?.distance?.text;
        const duration = response.data.rows[0]?.elements[0]?.duration?.text;

        const distanceInMeters =
          response.data.rows[0]?.elements[0]?.distance?.value;

        return {
          sourceAddresses,
          destinationAddresses,
          distance,
          distanceInMeters,
          duration,
        };
      } else {
        throw new Error(
          "Failed to calculate route. Please check coordinates and API key."
        );
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      throw error;
    }
  }

  async calculatePath(
    source: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: String
  ) {
    try {
      const apiKey = "AIzaSyC2znSVKp2NenYkrawAuAUv8V379X_V9WI";
      const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${source.lat},${source.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}&key=${apiKey}`;

      const response = await axios.get(apiUrl);
      if (response.data.status === "OK") {
        const route = response.data.routes[0];
        const distance =
          route?.legs.reduce((acc, leg) => acc + leg.distance.value, 0) ?? 0;
        const duration =
          route?.legs.reduce((acc, leg) => acc + leg.duration.value, 0) ?? 0;

        return { route, distance, duration };
      } else {
        throw new Error(
          "Failed to calculate shortest path. Please check API key and coordinates."
        );
      }
    } catch (error) {
      console.error("Error calculating path:", error);
      throw error;
    }
  }
}
