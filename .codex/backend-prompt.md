# Context

The backend is all in the `./backend` folder and it is written in Fastify with TypeScript. The database will be a SQLite database.

The backend does polling of information from LTA's DataMall (https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html) and processes and stores useful information for analytics/frontend purposes. 

# Data Sources

## Bus Service

When querying for bus services information, we get the following sample data for bus service 261:

```json
{
  "odata.metadata": "https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusServices",
  "value": [
    {
      "ServiceNo": "261",
      "Operator": "SBST",
      "Direction": 1,
      "Category": "FEEDER",
      "OriginCode": "54009",
      "DestinationCode": "54009",
      "AM_Peak_Freq": "03-05",
      "AM_Offpeak_Freq": "05-07",
      "PM_Peak_Freq": "04-07",
      "PM_Offpeak_Freq": "05-09",
      "LoopDesc": "Ang Mo Kio Ave 10"
    }
  ]
}
```

# Versions

## v0.1

For starters, let's focus on one particular service: 261 and the bus stops that it serves. We shall build the backend and database models before starting on the frontend for this particular service and its bus stops.
