import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { LOCATIONS } from "./constants";
import axios from "axios";

interface Coordinates {
  lat: number;
  lng: number;
}

@Injectable()
export class AppService {
  getPing(): any {
    return {
      server_time: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      server_name: "delivery-route-optimizer-api",
      version: "1.0",
    };
  }

  async calculateRoute(data: { coordinates: Coordinates[] }) {
    try {
      let startLocation = data.coordinates[0];
      let unvisitedLocations = [...data.coordinates];
      let route = [];
      let addressesMap = new Map();

      while (unvisitedLocations.length > 0) {
        let nearestLocation = null;
        let shortestDistance = Infinity;
        let shortestDistanceText = null;

        for (const location of unvisitedLocations) {
          const distanceData = await this.calculateDistance(
            startLocation,
            location,
            addressesMap
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
          nearestLocation.originAddress = addressesMap.get(
            `${nearestLocation.lat},${nearestLocation.lng}`
          );
          nearestLocation.shortestDistanceText = shortestDistanceText;
          route.push(nearestLocation);
          unvisitedLocations = unvisitedLocations.filter(
            (loc) =>
              loc.lat !== nearestLocation.lat || loc.lng !== nearestLocation.lng
          );
          startLocation = {
            lat: nearestLocation.lat,
            lng: nearestLocation.lng,
          };
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
    destination: { lat: number; lng: number },
    addressesMap: any
  ) {
    try {
      const apiKey = "AIzaSyAg1jbL4bRBmiqWx5ZQImooTyRSMQTOtcs";
      const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${source.lat},${source.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}`;

      const response = await axios.get(apiUrl);

      if (response.data.status === "OK") {
        const distance = response.data.rows[0]?.elements[0]?.distance?.text;
        const duration = response.data.rows[0]?.elements[0]?.duration?.text;
        const originAddresses = response.data.origin_addresses[0];
        const destinationAddresses = response.data.destination_addresses[0];

        const sourceKey = `${source.lat},${source.lng}`;
        const destKey = `${destination.lat},${destination.lng}`;
        if (!addressesMap.has(sourceKey)) {
          addressesMap.set(sourceKey, originAddresses);
        }
        if (!addressesMap.has(destKey)) {
          addressesMap.set(destKey, destinationAddresses);
        }

        const distanceInMeters =
          response.data.rows[0]?.elements[0]?.distance?.value;

        return {
          distance,
          distanceInMeters,
          duration,
          originAddresses,
          destinationAddresses,
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
    let addressesMap = new Map();

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
              newRoute[k + 1].coordinates,
              addressesMap
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
