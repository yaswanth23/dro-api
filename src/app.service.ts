import { Injectable } from "@nestjs/common";
import { LOCATIONS } from "./constants";
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

  async calculateRoute(data: { startLocation: { lat: number; lng: number } }) {
    try {
      let startLocation = data.startLocation;
      let unvisitedLocations = [...LOCATIONS];
      let route = [];

      while (unvisitedLocations.length > 0) {
        let nearestLocation = null;
        let shortestDistance = Infinity;
        let shortestDistanceText = null;

        for (const location of unvisitedLocations) {
          const distanceData = await this.calculateDistance(
            startLocation,
            location.coordinates
          );

          const distanceInMeters = distanceData.distanceInMeters;
          const distanceText = distanceData.distance;

          if (distanceInMeters < shortestDistance) {
            shortestDistance = distanceInMeters;
            nearestLocation = location;
            shortestDistanceText = distanceText;
          }
        }

        if (nearestLocation) {
          nearestLocation.shortestDistanceText = shortestDistanceText;
          route.push(nearestLocation);
          unvisitedLocations = unvisitedLocations.filter(
            (loc) => loc !== nearestLocation
          );
          startLocation = nearestLocation.coordinates;
        } else {
          throw new Error("Failed to find the nearest location.");
        }
      }

      return route;
    } catch (error) {
      console.error("Error calculating route:", error);
      throw error;
    }
  }

  async calculateDistance(
    source: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) {
    try {
      const apiKey = "AIzaSyAg1jbL4bRBmiqWx5ZQImooTyRSMQTOtcs";
      const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${source.lat},${source.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}`;

      const response = await axios.get(apiUrl);

      if (response.data.status === "OK") {
        const distance = response.data.rows[0]?.elements[0]?.distance?.text;
        const duration = response.data.rows[0]?.elements[0]?.duration?.text;

        const distanceInMeters =
          response.data.rows[0]?.elements[0]?.distance?.value;

        return {
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
}
