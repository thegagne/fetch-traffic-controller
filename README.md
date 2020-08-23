# 🚦 fetch-traffic-control

A traffic controlled version of fetch for Cloudflare Workers or Deno.

## Development

### Open Questions

* Naming? Need to be shorter?
* Load balancing may be tricky since we don't have built-in health checks here. Might just punt and rely on the superior Cloudflare Load Balancers.

### 2020-08-23 

* Retries are working
* Looked into changing folder structure to be more deno-like overall, and potentially using TypeScript, but decided to keep it simple for now. Expect changes later.

## Installation

Coming later. For now, just steal the code :)

## Usage

```
// Cloudflare Workers
import ControlledRequest, controlledFetch from './trafficControl.js';

// OR DENO
// import { ControlledRequest, controlledFetch } from "trafficControl.js"

async function handleRequest(request) {
  const trafficPolicy = {
    retries: 3,
    delay: 50, // time in ms
    timeout: 1000, // time in ms
    abort: false, // respond with 500
    circuitBreaker: false, // response with 503
    loadbalance: [
      { destination: '1.1.1.1', weight: 80 },
      { destination: '1.1.1.2', weight: 20 },
    ],
    mirror: [
      { destination: '1.1.1.3', sample: 10 },
    ],
    trafficInfoHeader: true,
  };
  const controlledRequest = new Request(request, {
    trafficPolicy,
  });
  return fetch(controlledRequest);
}
```

## Features Explained

### Retries

If we get a bad response or timeout to origin, retry the fetch the specified number of attempts.

#### Delay

Add the specified milliseconds of delay to the request. Can be useful for simulating network latency. Can be used with a randomly generated number to delay and disperse requests to spread out requests to prevent server overload.

### Timeout

If connection does not complete within the specified amount of milliseconds, abort and return a 504. If combined with retries, this will be a timeout for each request to origin, which means the total time to respond can be up to timeout * retries.

### Abort

Respond immediately with a 500 status code and text `Server Abort.`

### Circuit Breaker

Respond immediately with a 503 status code and text `No server available to fulfill the request.`

### Load Balance

Weighted load balancer, with an array of origin ips and weights. May not be implemented in favor of native Cloudflare Load Balancers which have nicer features like health checks.

### Mirror

Mirror the traffic to an alternate origin and discard the duplicate response. Specify a sample rate (percentage). Useful for testing an origin without affecting production traffic.

### Traffic Info Response Header

Sends info about processing along with the request, such has the number of retries, amount of delay added, etc.
Passed along as 'traffic-info' header.
On by default, can be turned off by setting `trafficInfoHeader: false`.

## Tests

Although my target platform is Cloudflare Workers, running local tests is much simpler using deno. 
Unlike node, deno has a built in `fetch` and `Request` and thus is compatible with Workers for the purposes of this library.

To test:

```
cd test
deno test --allow-net
```