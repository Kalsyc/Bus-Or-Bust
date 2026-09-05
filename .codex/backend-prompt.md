# Context

The backend is all in the `./backend` folder and it is written in Fastify with TypeScript. The database will be a SQLite database.

The backend does polling of information from LTA's DataMall (https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html) and processes and stores useful information for analytics/frontend purposes. 

# Versions

## v0.1

For starters, let's focus on one particular service: 261 and the bus stops that it serves. We shall build the backend and database models before starting on the frontend for this particular service and its bus stops.
