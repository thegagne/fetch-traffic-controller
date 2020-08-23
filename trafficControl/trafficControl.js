export class ControlledRequest extends Request {
  /**
   * Request with optional trafficPolicy in init.
   * @param {*} request
   * @param {object} init
   *   @param init.retries: int,
   *   @param init.attempt: int,
   *   @param init.delay: int (time in ms)
   *   @param init.abort: bool, // respond with 500
   *   @param init.circuitBreaker: bool, // response with 503
   *   @param init.timeout: int, // (time in ms)
   *   @param init.loadbalance: [ { destination: '<ip>', weight: int }, ... ],
   *   @param init.mirror: [ { destination: '<ip>', sample: int }, ... ]'
   */
  constructor(request, init) {
    super(request, init);
    if (init && init.trafficPolicy) {
      this.trafficPolicy = init.trafficPolicy;
      if (!init.trafficPolicy.attempt) {
        this.trafficPolicy.attempt = 1;
      }
    }
  }
}

export async function controlledFetch(controlledRequest) {
  /**
   * @param {ControlledRequest}
   * @returns {Response}
   */

  if (!controlledRequest.trafficPolicy) {
    return fetch(controlledRequest);
  }

  if ( controlledRequest.trafficPolicy.delay > 0 ) {
    // add delay
    
  }
  return fetch(controlledRequest)
    .then((response) => {
      if (!response.ok && !(response.status < 500)) {
        // retries
        console.log(`attempt ${controlledRequest.trafficPolicy.attempt}`)
        if (controlledRequest.trafficPolicy.attempt <= controlledRequest.trafficPolicy.retries) {
          response.text(); // burning this so deno doesn't complain
          let nextRequest = new ControlledRequest(controlledRequest, 
            { trafficPolicy: controlledRequest.trafficPolicy });
          nextRequest.trafficPolicy.attempt += 1;
          console.log(`next attempt: ${nextRequest.trafficPolicy.attempt}`)

          return controlledFetch(nextRequest);
        }
        return response;
      }
      return response;
    }).then((response) => {
      let modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      modifiedResponse.headers.set('traffic-info', `retries=${controlledRequest.trafficPolicy.attempt - 1}`);
      return modifiedResponse;
    });
}