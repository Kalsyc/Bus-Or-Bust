export type ServiceDirection = {
  direction: number
  operator: string
  category: string
  originCode: string
  destinationCode: string
  frequencies: {
    amPeak: string
    amOffpeak: string
    pmPeak: string
    pmOffpeak: string
  }
  loopDescription: string
}

export type ServiceStop = {
  direction: number
  stopSequence: number
  busStopCode: string
  distanceKm: number
  name: string
  roadName: string
  location: {
    latitude: number
    longitude: number
  }
  operatingHours: {
    weekday: { firstBus: string; lastBus: string }
    saturday: { firstBus: string; lastBus: string }
    sunday: { firstBus: string; lastBus: string }
  }
}

export type Service261Data = {
  serviceNo: string
  directions: ServiceDirection[]
  stops: ServiceStop[]
}
