import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
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
      let findlocation = LOCATIONS.find(
        (location) =>
          location.coordinates.lat === data.startLocation.lat &&
          location.coordinates.lng === data.startLocation.lng
      );

      if (!findlocation) {
        throw new HttpException(
          "Start location not found in the provided locations.",
          HttpStatus.NOT_FOUND
        );
      }

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
        throw new HttpException(
          "Failed to calculate route. Please check coordinates and API key.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      throw error;
    }
  }

  //using 2-opt
  async twoOpt(startLocation: { lat: number; lng: number }) {
    const foundStartLocation = LOCATIONS.find(
      (location) =>
        location.coordinates.lat === startLocation.lat &&
        location.coordinates.lng === startLocation.lng
    );

    if (!foundStartLocation) {
      throw new HttpException(
        "Start location not found in the provided locations.",
        HttpStatus.NOT_FOUND
      );
    }

    let route = LOCATIONS.filter((location) => location !== foundStartLocation);

    route = [foundStartLocation, ...route];

    let improved = true;
    let bestRoute = [...route];

    while (improved) {
      improved = false;
      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const newRoute = [...route];

          [newRoute[i + 1], newRoute[j]] = [newRoute[j], newRoute[i + 1]];

          let newDistance = 0;
          for (let k = 0; k < newRoute.length - 1; k++) {
            const distance = await this.calculateDistance(
              newRoute[k].coordinates,
              newRoute[k + 1].coordinates
            );
            newDistance += distance.distanceInMeters;
          }

          if (newDistance < bestRoute.length) {
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
      route = bestRoute;
    }
    return bestRoute;
  }
}
